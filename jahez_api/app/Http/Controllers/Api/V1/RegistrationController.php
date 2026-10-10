<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DocumentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CheckImcRegistrationNumberRequest;
use App\Http\Requests\Api\V1\RegisterFactoryRequest;
use App\Http\Requests\Api\V1\RegisterServiceProviderRequest;
use App\Http\Resources\V1\SectorResource;
use App\Http\Resources\V1\ServiceCategoryResource;
use App\Models\ImcRegisteredNumber;
use App\Models\Sector;
use App\Models\ServiceCategory;
use App\Models\ServiceProvider;
use App\Services\OrganizationRegistrar;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Public self-registration of factories and service providers (ADR-019).
 *
 * A registration is validated here and created synchronously in the same request: the
 * organization, its first member (with the password chosen on the form) and the
 * uploads. The response is the same 202 whether or not the email already has an
 * account, and the request does the same work either way (validate, and for a new
 * email store the uploads and create the records), so neither the response nor its
 * timing reveals which emails are registered (ADR-011). No email is ever sent from
 * this path: the new member signs in immediately with the chosen password.
 */
class RegistrationController extends Controller
{
    public const RESPONSE_MESSAGE = 'Thank you. Your account has been created: sign in now with your email address and password.';

    public function __construct(private readonly OrganizationRegistrar $registrar) {}

    /**
     * What the public registration forms need: the sectors, the factory sizes and the
     * service catalog. The same reference data the signed-in endpoints return, read-only.
     */
    public function options(): JsonResponse
    {
        return response()->json(['data' => [
            'sectors' => SectorResource::collection(Sector::query()->orderBy('sort_order')->get()),
            'factory_sizes' => array_map(
                fn (string $code, string $name): array => ['code' => $code, 'name_ar' => $name],
                array_keys((array) config('jahez.factories.sizes')),
                array_values((array) config('jahez.factories.sizes')),
            ),
            'service_categories' => ServiceCategoryResource::collection(ServiceCategory::query()->with('services')->orderBy('sort_order')->get()),
            'documents' => [
                'logo' => ['extensions' => DocumentType::Logo->allowedExtensions(), 'max_kb' => DocumentType::Logo->maxKilobytes()],
                'legal' => ['extensions' => DocumentType::CommercialRegistration->allowedExtensions(), 'max_kb' => DocumentType::CommercialRegistration->maxKilobytes()],
            ],
        ]]);
    }

    /**
     * The public live check of a factory IMC number during self-registration: whether
     * the number is on the IMC list. Answers only the boolean, so a visitor knows to
     * contact IMC before filling the whole form.
     */
    public function checkImcNumber(CheckImcRegistrationNumberRequest $request): JsonResponse
    {
        return response()->json(['data' => [
            'exists' => ImcRegisteredNumber::isRegistered($request->string('number')->toString()),
        ]]);
    }

    public function factory(RegisterFactoryRequest $request): JsonResponse
    {
        $email = $request->string('contact_email')->toString();
        if ($this->registrar->emailTaken($email)) {
            return $this->accepted();
        }

        $this->create(
            $request,
            OrganizationRegistrar::FACTORY,
            $request->safe()->only(['name', 'legal_name', 'size', 'contact_name', 'contact_job_title', 'contact_email', 'contact_phone', 'website', 'governorate', 'city', 'address', 'commercial_registration_number', 'tax_registration_number', 'imc_number']),
            ['sectors' => $request->validated('sectors', []), 'services' => []],
            ['name' => $request->string('contact_name')->toString(), 'email' => $email, 'password' => $request->string('password')->toString()],
        );

        return $this->accepted();
    }

    public function serviceProvider(RegisterServiceProviderRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();
        if ($this->registrar->emailTaken($email)) {
            return $this->accepted();
        }

        $this->create(
            $request,
            OrganizationRegistrar::SERVICE_PROVIDER,
            $request->safe()->only([...ServiceProvider::PROFILE_FIELDS, ...ServiceProvider::LEGAL_FIELDS]),
            ['sectors' => $request->validated('sectors', []), 'services' => $request->validated('services', [])],
            ['name' => $request->string('representative_name')->toString(), 'email' => $email, 'password' => $request->string('password')->toString()],
        );

        return $this->accepted();
    }

    /**
     * Stage the uploads, then create the organization in the same request. If storing
     * a file or creating the records fails, the files staged so far are deleted, so no
     * orphan upload stays behind. A concurrent registration that takes the email first
     * ends with the same response and no records.
     *
     * @param  OrganizationRegistrar::FACTORY|OrganizationRegistrar::SERVICE_PROVIDER  $kind
     * @param  array<string, mixed>  $details  validated organization fields
     * @param  array{sectors: list<string>, services: list<string>}  $codes
     * @param  array{name: string, email: string, password: string}  $account  plain password, hashed here
     */
    private function create(FormRequest $request, string $kind, array $details, array $codes, array $account): void
    {
        $disk = (string) config('jahez.documents.disk');
        $folder = 'documents/registrations/'.Str::uuid()->toString();
        $created = false;

        try {
            $documents = $this->stageDocuments($request, $disk, $folder);
            try {
                $this->registrar->register(
                    $kind,
                    $details,
                    $codes,
                    ['name' => $account['name'], 'email' => $account['email'], 'password_hash' => Hash::make($account['password'])],
                    $documents,
                    (string) Str::uuid(),
                    $request->ip(),
                );
                $created = true;
            } catch (UniqueConstraintViolationException) {
                // Another registration took the email first: same silent response.
            }
        } catch (Throwable $exception) {
            Storage::disk($disk)->deleteDirectory($folder);

            throw $exception;
        }

        if (! $created) {
            Storage::disk($disk)->deleteDirectory($folder);
        }
    }

    /**
     * Store the uploads on the private documents disk under random names. The registrar
     * turns them into the organization's documents, or they are deleted when nothing is
     * created.
     *
     * @return list<array{type: string, disk: string, path: string, original_name: string, mime_type: string, size_bytes: int, sha256: string}>
     */
    private function stageDocuments(FormRequest $request, string $disk, string $folder): array
    {
        $staged = [];

        foreach (DocumentType::REQUEST_FIELDS as $field => $type) {
            $file = $request->file($field);
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $extension = strtolower($file->guessExtension() ?? $file->extension());
            $path = Storage::disk($disk)->putFileAs($folder, $file, Str::uuid()->toString().'.'.$extension);
            if ($path === false) {
                throw new RuntimeException('The uploaded file could not be stored.');
            }

            $staged[] = [
                'type' => $type->value,
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => (string) $file->getMimeType(),
                'size_bytes' => (int) $file->getSize(),
                'sha256' => (string) hash_file('sha256', (string) $file->getRealPath()),
            ];
        }

        return $staged;
    }

    private function accepted(): JsonResponse
    {
        return response()->json(['data' => ['message' => self::RESPONSE_MESSAGE]], Response::HTTP_ACCEPTED);
    }
}

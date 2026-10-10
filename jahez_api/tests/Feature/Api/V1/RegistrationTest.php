<?php

use App\Enums\AuditEvent;
use App\Enums\ProviderApprovalStatus;
use App\Enums\Role;
use App\Http\Controllers\Api\V1\RegistrationController;
use App\Models\AuditLog;
use App\Models\Factory;
use App\Models\ImcRegisteredNumber;
use App\Models\OrganizationDocument;
use App\Models\ServiceProvider;
use App\Models\User;
use App\Services\OrganizationRegistrar;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    Storage::fake('local');
    Notification::fake();
});

/**
 * A complete factory registration form. The IMC number is whitelisted first (a factory
 * registers only for an IMC-registered number), unless the test overrides it with a
 * value that could never be whitelisted (null or a malformed number).
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function factoryRegistration(array $overrides = []): array
{
    $payload = [
        'name' => 'مصنع النيل للأغذية',
        'legal_name' => 'شركة النيل للصناعات الغذائية ش.م.م',
        'size' => 'medium',
        'sectors' => ['food'],
        'contact_name' => 'Mona Hassan',
        'contact_job_title' => 'Digital transformation lead',
        'contact_email' => 'mona@nile-foods.example',
        'contact_phone' => '+20 100 000 0000',
        'website' => 'https://nile-foods.example',
        'password' => 'correct horse battery staple',
        'password_confirmation' => 'correct horse battery staple',
        'governorate' => 'القاهرة',
        'city' => 'العبور',
        'address' => 'المنطقة الصناعية الأولى',
        'commercial_registration_number' => '123456',
        'tax_registration_number' => '987-654-321',
        'imc_number' => 'IMC-2026-001',
        'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
        'commercial_registration_document' => UploadedFile::fake()->create('cr.pdf', 300, 'application/pdf'),
        'tax_registration_document' => UploadedFile::fake()->create('tax.pdf', 300, 'application/pdf'),
        ...$overrides,
    ];

    $number = $payload['imc_number'] ?? null;
    if (is_string($number) && preg_match('/^[0-9A-Za-z\x{0660}-\x{0669} \/-]{1,50}$/u', $number)) {
        ImcRegisteredNumber::query()->firstOrCreate(['number' => $number], ['name' => $payload['legal_name']]);
    }

    return $payload;
}

/**
 * A complete provider registration form.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function providerRegistration(array $overrides = []): array
{
    return [
        'name' => 'Delta Automation',
        'legal_name' => 'Delta Automation Systems S.A.E.',
        'description' => 'Industrial automation and MES integration.',
        'representative_name' => 'Omar Adel',
        'job_title' => 'CEO',
        'email' => 'omar@delta-automation.example',
        'phone' => '+20 2 1234 5678',
        'password' => 'correct horse battery staple',
        'password_confirmation' => 'correct horse battery staple',
        'website' => 'https://delta-automation.example',
        'dx_experience_years' => 8,
        'governorate' => 'الجيزة',
        'city' => 'السادس من أكتوبر',
        'address' => 'المنطقة الصناعية الثالثة',
        'commercial_registration_number' => '445566',
        'tax_registration_number' => '112-233-445',
        'imc_number' => 'IMC-2026-009',
        'sectors' => ['food', 'chemical'],
        'services' => ['automation_ot.01', 'erp_business_applications.01'],
        ...$overrides,
    ];
}

/**
 * An upload whose content type is detected from its bytes, as for a real request. (The
 * fake files of UploadedFile::fake() report the type their name suggests.)
 */
function uploadedFileWithContent(string $clientName, string $content): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'upload');
    file_put_contents($path, $content);

    return new UploadedFile($path, $clientName, null, null, true);
}

describe('options', function () {
    it('gives visitors the sectors, sizes, catalog and upload limits without a token', function () {
        $response = $this->getJson(route('api.v1.registration.options'))->assertOk();

        expect($response->json('data.sectors.*.code'))->toContain('food')
            ->and($response->json('data.factory_sizes.*.code'))->toBe(['small', 'medium', 'large'])
            ->and($response->json('data.service_categories'))->toHaveCount(7)
            ->and($response->json('data.documents.logo.extensions'))->toBe(['jpg', 'jpeg', 'png', 'webp'])
            ->and($response->json('data.documents.legal.extensions'))->toBe(['pdf', 'jpg', 'jpeg', 'png']);
    });
});

describe('factory registration', function () {
    it('creates the factory, its verified first member and its documents, and the member signs in immediately', function () {
        $response = $this->post(route('api.v1.registration.factories'), factoryRegistration([
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
            'commercial_registration_document' => UploadedFile::fake()->create('cr.pdf', 300, 'application/pdf'),
        ]), ['Accept' => 'application/json']);

        $response->assertAccepted()->assertExactJson(['data' => ['message' => RegistrationController::RESPONSE_MESSAGE]]);

        $factory = Factory::query()->sole();
        $member = User::query()->where('email', 'mona@nile-foods.example')->sole();
        expect($factory->only(['name', 'legal_name', 'size', 'contact_name', 'contact_email', 'governorate', 'commercial_registration_number', 'tax_registration_number', 'imc_number']))->toBe([
            'name' => 'مصنع النيل للأغذية',
            'legal_name' => 'شركة النيل للصناعات الغذائية ش.م.م',
            'size' => 'medium',
            'contact_name' => 'Mona Hassan',
            'contact_email' => 'mona@nile-foods.example',
            'governorate' => 'القاهرة',
            'commercial_registration_number' => '123456',
            'tax_registration_number' => '987-654-321',
            'imc_number' => 'IMC-2026-001',
        ])
            ->and($factory->sectors()->pluck('code')->all())->toBe(['food'])
            ->and($member->role)->toBe(Role::FactoryMember)
            ->and($member->factory_id)->toBe($factory->id)
            ->and($member->service_provider_id)->toBeNull()
            ->and($member->name)->toBe('Mona Hassan');

        $documents = OrganizationDocument::query()->where('factory_id', $factory->id)->orderBy('type')->get();
        expect($documents->map(fn (OrganizationDocument $document): array => [$document->type->value, $document->status->value])->all())
            ->toBe([['commercial_registration', 'active'], ['logo', 'active'], ['tax_registration', 'active']]);
        foreach ($documents as $document) {
            Storage::disk('local')->assertExists($document->path);
            expect($document->path)->toStartWith('documents/registrations/');
        }

        // No email is ever sent from registration: the member is verified and signs in at once.
        expect($member->email_verified_at)->not->toBeNull();
        Notification::assertNothingSent();

        $this->postJson(route('api.v1.auth.login'), ['email' => 'mona@nile-foods.example', 'password' => 'correct horse battery staple', 'device_name' => 'web'])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'factory_member')
            ->assertJsonPath('data.user.organization.type', 'factory');
    });

    it('rejects a wrong password for the new member', function () {
        $this->post(route('api.v1.registration.factories'), factoryRegistration(), ['Accept' => 'application/json'])->assertAccepted();

        $this->postJson(route('api.v1.auth.login'), ['email' => 'mona@nile-foods.example', 'password' => 'a guessed password', 'device_name' => 'web'])->assertUnprocessable();
    });

    it('records the registration in the audit log with the address it came from', function () {
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.20'])
            ->post(route('api.v1.registration.factories'), factoryRegistration(), ['Accept' => 'application/json'])
            ->assertAccepted();

        $entry = AuditLog::query()->where('event', AuditEvent::FactoryRegistered)->sole();
        expect($entry->actor_user_id)->toBe(User::query()->sole()->id)
            ->and($entry->subject_id)->toBe(Factory::query()->sole()->id)
            ->and($entry->ip_address)->toBe('203.0.113.20')
            ->and(Arr::except($entry->metadata, 'registration_id'))->toEqual(['name' => 'مصنع النيل للأغذية', 'sectors' => ['food'], 'documents' => ['logo', 'commercial_registration', 'tax_registration']])
            ->and(Str::isUuid($entry->metadata['registration_id'] ?? null))->toBeTrue();
    });

    it('requires every factory field except the website, the IMC number and all three documents', function () {
        config(['jahez.registration.per_hour_per_ip' => 100]);
        $this->postJson(route('api.v1.registration.factories'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name', 'legal_name', 'size', 'sectors',
                'contact_name', 'contact_job_title', 'contact_email', 'contact_phone',
                'password',
                'governorate', 'city', 'address',
                'commercial_registration_number', 'tax_registration_number', 'imc_number',
                'logo', 'commercial_registration_document', 'tax_registration_document',
            ]);
        $this->assertDatabaseCount('factories', 0);

        $this->postJson(route('api.v1.registration.factories'), factoryRegistration(['sectors' => []]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sectors']);
        $this->assertDatabaseCount('factories', 0);

        foreach (['legal_name', 'contact_job_title', 'contact_phone', 'governorate', 'city', 'address', 'commercial_registration_number', 'tax_registration_number', 'imc_number'] as $field) {
            $this->postJson(route('api.v1.registration.factories'), factoryRegistration([$field => null]))
                ->assertUnprocessable()
                ->assertJsonValidationErrors([$field]);
        }
        $this->assertDatabaseCount('factories', 0);
    });

    it('treats the website as optional but still validates its shape when sent', function () {
        $this->post(route('api.v1.registration.factories'), factoryRegistration(['website' => null]), ['Accept' => 'application/json'])
            ->assertAccepted();

        expect(Factory::query()->sole()->website)->toBeNull();
    });

    it('rejects unknown sectors, sizes and malformed details', function () {
        $this->postJson(route('api.v1.registration.factories'), factoryRegistration([
            'sectors' => ['space_mining'],
            'size' => 'gigantic',
            'contact_email' => 'not-an-email',
            'website' => 'javascript:alert(1)',
            'commercial_registration_number' => '12<script>',
            'imc_number' => '12<script>',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sectors.0', 'size', 'contact_email', 'website', 'commercial_registration_number', 'imc_number']);
    });

    it('ignores a role, organization or approval sent with the form', function () {
        $this->post(route('api.v1.registration.factories'), factoryRegistration([
            'role' => 'imc_admin',
            'factory_id' => 999,
            'service_provider_id' => 999,
        ]), ['Accept' => 'application/json'])->assertAccepted();

        $member = User::query()->sole();
        expect($member->role)->toBe(Role::FactoryMember)
            ->and($member->factory_id)->toBe(Factory::query()->sole()->id)
            ->and($member->service_provider_id)->toBeNull();
    });
});

describe('provider registration', function () {
    it('creates a pending provider that factories cannot see until IMC approves it', function () {
        $this->post(route('api.v1.registration.service-providers'), providerRegistration([
            'approval_status' => 'approved',
            'tax_registration_document' => UploadedFile::fake()->create('tax.pdf', 200, 'application/pdf'),
        ]), ['Accept' => 'application/json'])->assertAccepted();

        $provider = ServiceProvider::query()->sole();
        $member = User::query()->where('email', 'omar@delta-automation.example')->sole();
        expect($provider->approval_status)->toBe(ProviderApprovalStatus::Pending)
            ->and($provider->only(['name', 'legal_name', 'description', 'representative_name', 'email', 'dx_experience_years', 'commercial_registration_number', 'imc_number']))->toBe([
                'name' => 'Delta Automation',
                'legal_name' => 'Delta Automation Systems S.A.E.',
                'description' => 'Industrial automation and MES integration.',
                'representative_name' => 'Omar Adel',
                'email' => 'omar@delta-automation.example',
                'dx_experience_years' => 8,
                'commercial_registration_number' => '445566',
                'imc_number' => 'IMC-2026-009',
            ])
            ->and($provider->services()->pluck('code')->sort()->values()->all())->toBe(['automation_ot.01', 'erp_business_applications.01'])
            ->and($member->role)->toBe(Role::ProviderMember)
            ->and($member->service_provider_id)->toBe($provider->id)
            ->and($member->email_verified_at)->not->toBeNull()
            ->and($provider->documents()->sole()->type->value)->toBe('tax_registration');
        Notification::assertNothingSent();
        expect(AuditLog::query()->where('event', AuditEvent::ServiceProviderRegistered)->sole()->metadata['documents'])->toBe(['tax_registration']);

        $factory = Factory::factory()->inSectors('food')->create();
        Sanctum::actingAs(User::factory()->factoryMember($factory)->create());
        $this->getJson(route('api.v1.provider-directory'))->assertOk()->assertJsonCount(0, 'data');
        $this->getJson(route('api.v1.provider-directory.show', $provider))->assertNotFound();
    });

    it('requires the company name, legal name, registration numbers, the representative\'s name and email, and a password', function () {
        $this->postJson(route('api.v1.registration.service-providers'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'legal_name', 'representative_name', 'email', 'password', 'commercial_registration_number', 'tax_registration_number', 'imc_number']);
    });

    it('rejects an unknown catalog service', function () {
        $this->postJson(route('api.v1.registration.service-providers'), providerRegistration(['services' => ['not_a_service']]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['services.0']);
    });
});

describe('uploads', function () {
    it('rejects files whose content is not an allowed type, whatever their name', function (string $field, Closure $makeFile) {
        $this->post(route('api.v1.registration.service-providers'), providerRegistration([$field => $makeFile()]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field]);

        $this->assertDatabaseCount('service_providers', 0);
        expect(Storage::disk('local')->allFiles())->toBe([]);
    })->with([
        'an SVG logo' => ['logo', fn () => UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
        'a PDF logo' => ['logo', fn () => UploadedFile::fake()->create('logo.pdf', 50, 'application/pdf')],
        'a script named .pdf' => ['commercial_registration_document', fn () => uploadedFileWithContent('cr.pdf', '<?php echo "x";')],
        'HTML named .png' => ['logo', fn () => uploadedFileWithContent('logo.png', '<html><script>alert(1)</script></html>')],
        'an executable' => ['tax_registration_document', fn () => UploadedFile::fake()->create('tax.exe', 50, 'application/x-msdownload')],
    ]);

    it('rejects files over the size limit', function () {
        $this->post(route('api.v1.registration.factories'), factoryRegistration([
            'logo' => UploadedFile::fake()->image('logo.png')->size(3000),
            'tax_registration_document' => UploadedFile::fake()->create('tax.pdf', 6000, 'application/pdf'),
        ]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['logo', 'tax_registration_document']);
    });
});

describe('existing accounts', function () {
    it('answers exactly as for a new email, creates nothing and sends nothing', function () {
        $existing = User::factory()->create(['email' => 'mona@nile-foods.example']);
        $factoriesBefore = Factory::query()->count();

        $response = $this->post(route('api.v1.registration.factories'), factoryRegistration([
            'contact_email' => 'MONA@nile-foods.example',
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]), ['Accept' => 'application/json']);

        $response->assertAccepted()->assertExactJson(['data' => ['message' => RegistrationController::RESPONSE_MESSAGE]]);
        $this->assertDatabaseCount('factories', $factoriesBefore);
        $this->assertDatabaseCount('organization_documents', 0);
        expect(User::query()->count())->toBe(1)
            ->and(Storage::disk('local')->allFiles())->toBe([])
            ->and(AuditLog::query()->where('event', AuditEvent::FactoryRegistered)->count())->toBe(0);
        Notification::assertNothingSent();
    });
});

describe('abuse limits', function () {
    it('limits registrations per address', function () {
        config(['jahez.registration.per_hour_per_ip' => 2]);

        foreach (['a', 'b'] as $suffix) {
            $this->post(route('api.v1.registration.factories'), factoryRegistration([
                'contact_email' => "{$suffix}@example.test",
                'imc_number' => "IMC-2026-{$suffix}",
            ]), ['Accept' => 'application/json'])->assertAccepted();
        }

        $this->post(route('api.v1.registration.factories'), factoryRegistration(['contact_email' => 'c@example.test', 'imc_number' => 'IMC-2026-c']), ['Accept' => 'application/json'])
            ->assertTooManyRequests()
            ->assertHeader('Retry-After');
        $this->assertDatabaseCount('factories', 2);
    });
});

describe('failure handling', function () {
    it('keeps a single organization when the same registration is submitted twice for a new email', function () {
        $payload = factoryRegistration();

        $this->post(route('api.v1.registration.factories'), $payload, ['Accept' => 'application/json'])->assertAccepted();
        // A retry with the same email finds it taken and answers identically.
        $this->post(route('api.v1.registration.factories'), factoryRegistration([
            'imc_number' => 'IMC-2026-002',
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
            'commercial_registration_document' => UploadedFile::fake()->create('cr.pdf', 300, 'application/pdf'),
            'tax_registration_document' => UploadedFile::fake()->create('tax.pdf', 300, 'application/pdf'),
        ]), ['Accept' => 'application/json'])
            ->assertAccepted()
            ->assertExactJson(['data' => ['message' => RegistrationController::RESPONSE_MESSAGE]]);

        expect(Factory::query()->count())->toBe(1)
            ->and(User::query()->count())->toBe(1)
            ->and(OrganizationDocument::query()->count())->toBe(3);
        foreach (OrganizationDocument::query()->get() as $document) {
            Storage::disk('local')->assertExists($document->path);
        }
        Notification::assertNothingSent();
    });

    it('fails a concurrent registration that loses the email race', function () {
        $registrar = app(OrganizationRegistrar::class);
        $account = ['name' => 'Mona Hassan', 'email' => 'mona@nile-foods.example', 'password_hash' => Hash::make('correct horse battery staple')];

        $registrar->register(
            OrganizationRegistrar::FACTORY,
            ['name' => 'Nile Foods'],
            ['sectors' => [], 'services' => []],
            $account,
            [],
            (string) Str::uuid(),
            null,
        );

        // The unique constraint is the backstop: the controller answers identically and keeps no files.
        expect(fn () => $registrar->register(
            OrganizationRegistrar::FACTORY,
            ['name' => 'Nile Foods'],
            ['sectors' => [], 'services' => []],
            $account,
            [],
            (string) Str::uuid(),
            null,
        ))->toThrow(UniqueConstraintViolationException::class);
    });

    it('removes the files already staged when storing a later one fails', function () {
        $disk = Storage::fake('local');
        $calls = 0;
        $flaky = Mockery::mock($disk)->makePartial();
        $flaky->shouldReceive('putFileAs')->andReturnUsing(function (...$arguments) use ($disk, &$calls) {
            return ++$calls === 2 ? false : $disk->putFileAs(...$arguments);
        });
        Storage::set('local', $flaky);

        $this->post(route('api.v1.registration.factories'), factoryRegistration([
            'logo' => UploadedFile::fake()->image('logo.png'),
            'commercial_registration_document' => UploadedFile::fake()->create('cr.pdf', 100, 'application/pdf'),
        ]), ['Accept' => 'application/json'])->assertServerError();

        expect($disk->allFiles())->toBe([]);
    });
});

describe('direct password', function () {
    it('creates the provider member with the chosen password so they sign in without any email', function () {
        $this->post(route('api.v1.registration.service-providers'), providerRegistration([
            'password' => 'correct horse battery staple',
            'password_confirmation' => 'correct horse battery staple',
        ]), ['Accept' => 'application/json'])->assertAccepted();

        $member = User::query()->where('email', 'omar@delta-automation.example')->sole();
        Notification::assertNotSentTo($member, AccountInvitation::class);

        $this->postJson(route('api.v1.auth.login'), [
            'email' => 'omar@delta-automation.example',
            'password' => 'correct horse battery staple',
            'device_name' => 'web',
        ])->assertOk()->assertJsonPath('data.user.role', 'provider_member');
    });

    it('creates the factory member with the chosen password so they sign in without any email', function () {
        $this->post(route('api.v1.registration.factories'), factoryRegistration([
            'password' => 'correct horse battery staple',
            'password_confirmation' => 'correct horse battery staple',
        ]), ['Accept' => 'application/json'])->assertAccepted();

        $member = User::query()->where('email', 'mona@nile-foods.example')->sole();
        Notification::assertNotSentTo($member, AccountInvitation::class);

        $this->postJson(route('api.v1.auth.login'), [
            'email' => 'mona@nile-foods.example',
            'password' => 'correct horse battery staple',
            'device_name' => 'web',
        ])->assertOk()->assertJsonPath('data.user.role', 'factory_member');
    });

    it('requires a confirmed password of minimum length', function () {
        $this->postJson(route('api.v1.registration.service-providers'), providerRegistration([
            'password' => 'short',
            'password_confirmation' => 'different',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->assertDatabaseCount('service_providers', 0);

        $this->postJson(route('api.v1.registration.service-providers'), providerRegistration([
            'password' => null,
            'password_confirmation' => null,
        ]))->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->assertDatabaseCount('service_providers', 0);
    });

    it('rejects emails without a real domain shape', function () {
        $this->postJson(route('api.v1.registration.factories'), factoryRegistration([
            'contact_email' => 'user@invalid',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['contact_email']);
    });
});

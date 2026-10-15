<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ValidatesCodeLists;
use App\Http\Requests\Api\V1\Concerns\ValidatesOrganizationDetails;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Public factory registration (ADR-019), sent as multipart form data. The contact person
 * becomes the factory's first member and signs in immediately with the chosen password.
 * Whether the email already has an account is never revealed: a duplicate email gets the
 * same response and creates nothing (ADR-011).
 */
class RegisterFactoryRequest extends FormRequest
{
    use ValidatesCodeLists;
    use ValidatesOrganizationDetails {
        messages as protected organizationMessages;
    }

    /**
     * Get the validation rules that apply to the request. A factory needs at least one
     * sector: without one no provider is eligible for it (ADR-014). The IMC number must
     * be on the IMC-registered list, matched by the number only: an unknown number is
     * told to contact IMC instead of registering. Every field is required except the
     * website (owner decision, October 2026).
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['required', 'string', 'max:255'],
            'size' => ['required', 'string', Rule::in(array_keys((array) config('jahez.factories.sizes')))],
            ...$this->codeListRules('sectors', 'sectors'),
            'sectors' => ['required', 'array', 'min:1', 'max:'.DB::table('sectors')->count()],
            'contact_name' => ['required', 'string', 'max:255'],
            'contact_job_title' => ['required', 'string', 'max:255'],
            // RFC shape plus a dot in the domain (mirrors the frontend check): strict enough
            // to refuse `user@invalid`, without the flakiness of DNS lookups (and without
            // rejecting reserved test domains such as `.example`/`.test`).
            'contact_email' => ['required', 'string', 'email:rfc', 'regex:/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/', 'max:255'],
            'contact_phone' => ['required', 'string', 'regex:/^[0-9+() -]{6,30}$/'],
            'website' => ['sometimes', 'nullable', 'string', 'url:http,https', 'max:255'],
            // The member chooses the password on the form and signs in immediately:
            // no email round-trip, no invitation link. Always required with confirmation,
            // under the platform policy (at least 12 characters, at most 72 bytes; PA-06).
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'governorate' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:500'],
            'commercial_registration_number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
            'tax_registration_number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
            // On the IMC list, and not already registered by another factory (PA-10; the
            // unique index on factories.imc_number is the backstop for concurrent requests).
            'imc_number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN, Rule::exists('imc_registered_numbers', 'number'), Rule::unique($this->imcNumberTable(), 'imc_number')],
            ...$this->documentRules(true),
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...$this->organizationMessages(),
            'imc_number.exists' => 'هذا الرقم غير مسجل لدى الهيئة، برجاء التواصل مع الهيئة.',
        ];
    }

    /**
     * The table the IMC number must be unique within for factory registration.
     */
    protected function imcNumberTable(): string
    {
        return 'factories';
    }
}

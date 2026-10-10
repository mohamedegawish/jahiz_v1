<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ValidatesProviderProfile;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Public provider registration (ADR-019), sent as multipart form data: the workbook
 * fields (ADR-014) plus the registration details the owner added. The representative
 * becomes the provider's first member and signs in immediately with the chosen password.
 * The provider starts pending: factories see it only after IMC approves it. Whether the
 * email already has an account is never revealed: a duplicate gets the same response
 * and creates nothing (ADR-011).
 */
class RegisterServiceProviderRequest extends FormRequest
{
    use ValidatesProviderProfile;

    /**
     * Get the validation rules that apply to the request. The company name, legal name,
     * registration numbers, representative's name and email, and password are all required:
     * the account needs them, and the workbook marks nothing else as required (OQ-36).
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            ...$this->providerProfileRules(),
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['required', 'string', 'max:255'],
            'commercial_registration_number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
            'tax_registration_number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
            'imc_number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
            'representative_name' => ['required', 'string', 'max:255'],
            // RFC shape plus a dot in the domain (mirrors the frontend check): strict enough
            // to refuse `user@invalid`, without the flakiness of DNS lookups.
            'email' => ['required', 'string', 'email:rfc', 'regex:/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/', 'max:255'],
            // The member chooses the password on the form and signs in immediately:
            // no email round-trip, no invitation link. Always required with confirmation.
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed'],
            ...$this->documentRules(),
        ];
    }

    /**
     * The table the IMC number must be unique within for provider registration.
     */
    protected function imcNumberTable(): string
    {
        return 'service_providers';
    }
}

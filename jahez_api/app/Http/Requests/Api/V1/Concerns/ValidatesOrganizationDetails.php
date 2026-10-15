<?php

namespace App\Http\Requests\Api\V1\Concerns;

use App\Enums\DocumentType;
use Illuminate\Validation\Rule;

/**
 * Rules for the registration details factories and providers share (ADR-019): the legal
 * name, the address, the registration numbers and the uploaded documents. The shared
 * trait supplies format checks; each request decides which of these fields are required
 * and against which table the IMC number must be unique (OQ-59).
 */
trait ValidatesOrganizationDetails
{
    /**
     * Commercial and tax registration numbers, and the IMC file number: digits (Latin or
     * Arabic-Indic), letters, spaces, slashes and hyphens. Their official formats are not
     * documented, so nothing stricter is checked. The IMC number is unique within the
     * table that this request's organization kind maps to (OQ-59).
     */
    public const REGISTRATION_NUMBER_PATTERN = '/^[0-9A-Za-z\x{0660}-\x{0669} \/-]{1,50}$/u';

    /**
     * @return array<string, list<mixed>>
     */
    protected function legalDetailRules(): array
    {
        $imcRules = ['sometimes', 'nullable', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN];

        $table = $this->imcNumberTable();
        if ($table) {
            $imcRules[] = Rule::unique($table, 'imc_number')->ignore($this->imcNumberExemptId());
        }

        return [
            'legal_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'commercial_registration_number' => ['sometimes', 'nullable', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
            'tax_registration_number' => ['sometimes', 'nullable', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
            'imc_number' => $imcRules,
        ];
    }

    /**
     * The database table the IMC number must be unique within for this request kind, or
     * null when no uniqueness check applies (OQ-59).
     */
    protected function imcNumberTable(): ?string
    {
        return null;
    }

    /**
     * An ID to exclude from the uniqueness check (null at registration, where it always
     * applies). Overridden for profile-edit requests that re-validate against the model
     * being updated.
     */
    protected function imcNumberExemptId(): int|string|null
    {
        return null;
    }

    /**
     * @return array<string, list<mixed>>
     */
    protected function addressRules(): array
    {
        return [
            'governorate' => ['sometimes', 'nullable', 'string', 'max:100'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Upload rules for the request. When `$required` is true the logo and both registration
     * documents are mandatory (factory registration, ADR-019); when false they are optional
     * (provider registration, where IMC may request them later).
     *
     * @return array<string, list<mixed>>
     */
    protected function documentRules(bool $required = false): array
    {
        $prefix = $required ? ['required'] : ['sometimes', 'nullable'];
        $rules = [];
        foreach (DocumentType::REQUEST_FIELDS as $field => $type) {
            $rules[$field] = [...$prefix, ...$type->fileRules()];
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'commercial_registration_number.regex' => 'The commercial registration number may contain only digits, letters, spaces, / and -, up to 50 characters.',
            'tax_registration_number.regex' => 'The tax registration number may contain only digits, letters, spaces, / and -, up to 50 characters.',
            'imc_number.regex' => 'The IMC number may contain only digits, letters, spaces, / and -, up to 50 characters.',
            'imc_number.unique' => 'This IMC number is already registered to another organization.',
        ];
    }
}

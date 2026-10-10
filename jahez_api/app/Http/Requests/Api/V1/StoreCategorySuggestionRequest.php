<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A provider suggests a category missing from the catalog.
 */
class StoreCategorySuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->service_provider_id !== null;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name_ar' => ['required', 'string', 'max:255'],
            'name_en' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}

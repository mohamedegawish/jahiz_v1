<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Paginated suggestions: providers see their own, IMC sees all.
 */
class ListCategorySuggestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'filter.status' => ['sometimes', 'string', 'in:pending,approved,rejected'],
            'filter.provider' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function perPage(): int
    {
        $perPage = (int) $this->input('per_page', 15);

        return max(1, min(100, $perPage));
    }
}

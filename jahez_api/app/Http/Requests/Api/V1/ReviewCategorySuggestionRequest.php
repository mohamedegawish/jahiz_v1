<?php

namespace App\Http\Requests\Api\V1;

use App\Models\CategorySuggestion;
use Illuminate\Foundation\Http\FormRequest;

/**
 * IMC decision on a category suggestion: approval marks it as a workbook candidate,
 * rejection needs a reason the provider can read.
 */
class ReviewCategorySuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('review', CategorySuggestion::class) ?? false;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}

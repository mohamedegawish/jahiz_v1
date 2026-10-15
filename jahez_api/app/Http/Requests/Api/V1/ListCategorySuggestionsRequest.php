<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\CategorySuggestionStatus;
use App\Models\CategorySuggestion;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Paginated suggestions: providers see their own, IMC sees all. Authorization runs before
 * validation, so an outsider gets 404 whatever the filters say instead of learning from a
 * 422 that the endpoint applies to someone (CR-28 pattern, finding PA-30).
 */
class ListCategorySuggestionsRequest extends ListRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('viewAny', CategorySuggestion::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'filter' => ['sometimes', 'array:status,provider'],
            'filter.status' => ['sometimes', 'string', Rule::enum(CategorySuggestionStatus::class)],
            'filter.provider' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}

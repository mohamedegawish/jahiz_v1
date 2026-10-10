<?php

namespace App\Http\Requests\Api\V1;

use App\Models\ImcRegisteredNumber;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Filters for the IMC list of registered factory numbers. Every filter and sort is
 * allow-listed; values are bound as query parameters.
 */
class ListImcRegisteredNumbersRequest extends ListRequest
{
    /**
     * Allowed sort keys and the column and direction each one means.
     */
    private const SORTS = [
        'newest' => ['created_at', 'desc'],
        'oldest' => ['created_at', 'asc'],
        'name' => ['name', 'asc'],
        'number' => ['number', 'asc'],
    ];

    public function authorize(): bool
    {
        return Gate::allows('viewAny', ImcRegisteredNumber::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'sort' => ['sometimes', 'string', Rule::in(array_keys(self::SORTS))],
            'search' => ['sometimes', 'string', 'max:100'],
        ];
    }

    /**
     * The requested order, or null for the default (by id).
     *
     * @return array{0: string, 1: string}|null
     */
    public function sortColumnAndDirection(): ?array
    {
        return self::SORTS[$this->string('sort')->toString()] ?? null;
    }
}

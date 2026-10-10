<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ValidatesOrganizationDetails;
use App\Models\ImcRegisteredNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * A single IMC-registered factory number an administrator adds by hand. The check at
 * registration matches by the number only; the name is informational.
 */
class StoreImcRegisteredNumberRequest extends FormRequest
{
    use ValidatesOrganizationDetails;

    public function authorize(): bool
    {
        return Gate::allows('manage', ImcRegisteredNumber::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN, Rule::unique('imc_registered_numbers', 'number')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'number.regex' => 'The number may contain only digits, letters, spaces, / and -, up to 50 characters.',
            'number.unique' => 'This number is already registered.',
        ];
    }
}

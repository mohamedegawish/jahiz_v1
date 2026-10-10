<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ValidatesOrganizationDetails;
use App\Models\ImcRegisteredNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Renaming an IMC-registered factory number or correcting its number. The number stays
 * unique across the list.
 */
class UpdateImcRegisteredNumberRequest extends FormRequest
{
    use ValidatesOrganizationDetails;

    public function authorize(): bool
    {
        return Gate::allows('manage', $this->route('imcRegisteredNumber'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $row = $this->route('imcRegisteredNumber');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'number' => ['sometimes', 'required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN, Rule::unique('imc_registered_numbers', 'number')->ignore($row instanceof ImcRegisteredNumber ? $row->id : $row)],
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

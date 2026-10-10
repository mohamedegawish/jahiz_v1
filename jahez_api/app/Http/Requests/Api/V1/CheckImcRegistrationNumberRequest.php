<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ValidatesOrganizationDetails;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The public live check of a factory IMC number during self-registration
 * (GET /registration/imc-numbers/check): answers only whether the number is on the
 * IMC list, so a visitor knows to contact IMC before filling the whole form.
 */
class CheckImcRegistrationNumberRequest extends FormRequest
{
    use ValidatesOrganizationDetails;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'number' => ['required', 'string', 'regex:'.self::REGISTRATION_NUMBER_PATTERN],
        ];
    }
}

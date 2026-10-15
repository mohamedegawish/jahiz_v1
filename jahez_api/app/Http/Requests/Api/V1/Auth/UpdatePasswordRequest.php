<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * PUT /me/password: the signed-in account changes its own password. The current password
 * is required (a stolen token alone cannot take the account over), and the new one follows
 * the platform policy (Password::defaults(): at least 12 characters, at most 72 bytes).
 */
class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', 'confirmed', 'different:current_password', Password::defaults()],
        ];
    }
}

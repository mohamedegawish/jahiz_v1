<?php

namespace App\Http\Requests\Api\V1;

use App\Models\ImcRegisteredNumber;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;

/**
 * Bulk import of IMC-registered factory numbers from an Excel (.xlsx) or CSV file
 * with name + number columns. The file itself is validated here; every row is
 * validated again during the import, so one bad row never rejects the file.
 */
class ImportImcRegisteredNumbersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', ImcRegisteredNumber::class);
    }

    /**
     * Get the validation rules that apply to the request. The file kind is checked by
     * its extension (content sniffing of OOXML varies by platform); the rows are parsed
     * and validated again during the import itself.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:5120',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! $value instanceof UploadedFile || ! in_array(strtolower($value->getClientOriginalExtension()), ['csv', 'xlsx'], true)) {
                        $fail('Upload an Excel (.xlsx) or CSV file with name and number columns.');
                    }
                },
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [];
    }
}

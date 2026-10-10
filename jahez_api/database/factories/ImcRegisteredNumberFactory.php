<?php

namespace Database\Factories;

use App\Models\ImcRegisteredNumber;
use Illuminate\Database\Eloquent\Factories\Factory as ModelFactory;

/**
 * Synthetic IMC-registered numbers for tests only.
 *
 * @extends ModelFactory<ImcRegisteredNumber>
 */
class ImcRegisteredNumberFactory extends ModelFactory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company().' Factory',
            'number' => 'IMC-'.fake()->unique()->numerify('2026-####'),
        ];
    }
}

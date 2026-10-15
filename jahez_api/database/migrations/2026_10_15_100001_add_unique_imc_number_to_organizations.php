<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = ['factories', 'service_providers'];

    /**
     * Run the migrations.
     *
     * The IMC number identifies one organization (docs/api-endpoints.md), but registration
     * never checked it, so one whitelisted number could register several factories
     * (finding PA-10). A unique index per table is the backstop the validation rule cannot
     * be for concurrent requests (NULL stays allowed any number of times).
     *
     * Records registered before the fix may already share a number. This migration never
     * picks a winner or edits data: it stops with the ids involved, and IMC decides which
     * record keeps the number before it runs again.
     */
    public function up(): void
    {
        foreach (self::TABLES as $table) {
            $shared = DB::table($table)
                ->whereNotNull('imc_number')
                ->groupBy('imc_number')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('imc_number');

            if ($shared->isNotEmpty()) {
                $records = DB::table($table)
                    ->whereIn('imc_number', $shared)
                    ->orderBy('imc_number')
                    ->orderBy('id')
                    ->get(['id', 'imc_number'])
                    ->map(fn (object $row): string => "#{$row->id} ({$row->imc_number})")
                    ->implode(', ');

                throw new RuntimeException("Cannot make {$table}.imc_number unique: these records share an IMC number: {$records}. IMC decides which record keeps each number; correct the others (legal-change review or an administrator edit), then migrate again. Nothing was changed.");
            }
        }

        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->unique('imc_number');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropUnique(['imc_number']);
            });
        }
    }
};

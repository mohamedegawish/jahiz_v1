<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The IMC file number the owner asked for (registration forms, October 2026):
     * an optional free-text reference on factories and providers, validated like the
     * other registration numbers and editable under the same legal-change rules.
     */
    public function up(): void
    {
        Schema::table('factories', function (Blueprint $table) {
            $table->string('imc_number', 50)->nullable()->after('tax_registration_number');
        });
        Schema::table('service_providers', function (Blueprint $table) {
            $table->string('imc_number', 50)->nullable()->after('tax_registration_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('factories', function (Blueprint $table) {
            $table->dropColumn('imc_number');
        });
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn('imc_number');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The factory numbers IMC registered (the "الرقم المسجل لدى IMC" whitelist): a
     * factory self-registration is accepted only when its IMC number is on this list
     * (matched by the number only). IMC administrators manage the rows and bulk-import
     * them from an Excel/CSV file of name + number. Nothing is seeded.
     */
    public function up(): void
    {
        Schema::create('imc_registered_numbers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('number', 50);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique('number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('imc_registered_numbers');
    }
};

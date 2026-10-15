<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * How long each landing ad slide stays on screen, in seconds (2–120). It was kept in
     * the administrator's own browser storage, so visitors never got it (finding PA-15).
     * Null: the web client's default.
     */
    public function up(): void
    {
        Schema::table('landing_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('ad_rotation_seconds')->nullable()->after('footer_supervision');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('landing_settings', function (Blueprint $table) {
            $table->dropColumn('ad_rotation_seconds');
        });
    }
};

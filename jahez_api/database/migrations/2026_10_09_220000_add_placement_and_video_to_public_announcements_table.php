<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Split landing-page advertisements by placement (top hero, mid strip, footer)
     * and let the footer slot hold an admin-uploaded video instead of a cover image.
     *
     * `placement` defaults to 'top' so every existing announcement keeps appearing
     * in the hero; the mid strip and footer start empty until an administrator
     * moves an advertisement there. `video_*` columns mirror `cover_*` and stay
     * null for image-only announcements.
     */
    public function up(): void
    {
        Schema::table('public_announcements', function (Blueprint $table): void {
            $table->string('placement', 20)->default('top')->after('color');
            $table->string('video_disk', 50)->nullable()->after('cover_alt');
            $table->string('video_path')->nullable()->after('video_disk');
            $table->string('video_mime_type', 100)->nullable()->after('video_path');
        });
    }

    public function down(): void
    {
        Schema::table('public_announcements', function (Blueprint $table): void {
            $table->dropColumn(['placement', 'video_disk', 'video_path', 'video_mime_type']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The single row of landing-page content IMC edits (the logo, hero texts,
     * section texts and the FAQ). The row is created on the first update; every
     * column stays null until an administrator sets it, and the web client falls
     * back to its bundled copy for anything unset. Nothing is seeded.
     */
    public function up(): void
    {
        Schema::create('landing_settings', function (Blueprint $table) {
            $table->id();
            $table->string('logo_disk', 50)->nullable();
            $table->string('logo_path', 255)->nullable();
            $table->string('logo_mime_type', 100)->nullable();
            $table->string('hero_kicker', 120)->nullable();
            $table->string('hero_headline', 120)->nullable();
            $table->json('hero_tab_headlines')->nullable();
            $table->string('hero_subtitle', 500)->nullable();
            $table->string('hero_primary_cta', 60)->nullable();
            $table->string('hero_secondary_cta', 60)->nullable();
            $table->json('trust_facts')->nullable();
            $table->string('join_title', 120)->nullable();
            $table->string('join_description', 500)->nullable();
            $table->string('value_title', 120)->nullable();
            $table->string('value_subtitle', 300)->nullable();
            $table->string('about_paragraph_1', 2000)->nullable();
            $table->string('about_paragraph_2', 2000)->nullable();
            $table->json('about_chips')->nullable();
            $table->json('quick_facts')->nullable();
            $table->string('services_title', 120)->nullable();
            $table->json('service_cards')->nullable();
            $table->string('how_title', 120)->nullable();
            $table->string('how_description', 300)->nullable();
            $table->json('how_steps')->nullable();
            $table->string('faq_title', 120)->nullable();
            $table->json('faq_items')->nullable();
            $table->string('cta_title', 120)->nullable();
            $table->string('cta_subtitle', 200)->nullable();
            $table->string('cta_button', 60)->nullable();
            $table->string('cta_note', 120)->nullable();
            $table->string('footer_about', 300)->nullable();
            $table->string('footer_tagline', 120)->nullable();
            $table->string('footer_copyright', 200)->nullable();
            $table->string('footer_supervision', 200)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landing_settings');
    }
};

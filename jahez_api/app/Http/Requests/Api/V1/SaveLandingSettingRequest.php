<?php

namespace App\Http\Requests\Api\V1;

use App\Models\LandingSetting;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * The landing-page content (the logo file has its own actions). Every field is
 * optional and nullable: the update sets only the fields sent, and an explicit
 * null restores the web client's bundled copy for that field.
 */
class SaveLandingSettingRequest extends FormRequest
{
    public function authorize(): Response
    {
        $settings = LandingSetting::query()->first() ?? new LandingSetting;

        return Gate::inspect('update', $settings);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $text = fn (int $max): array => ['sometimes', 'nullable', 'string', "max:{$max}"];

        return [
            'hero_kicker' => $text(120),
            'hero_headline' => $text(120),
            'hero_tab_headlines' => ['sometimes', 'nullable', 'array'],
            'hero_tab_headlines.home' => $text(120),
            'hero_tab_headlines.assessment' => $text(120),
            'hero_tab_headlines.digital' => $text(120),
            'hero_tab_headlines.smart' => $text(120),
            'hero_tab_headlines.results' => $text(120),
            'hero_subtitle' => $text(500),
            'hero_primary_cta' => $text(60),
            'hero_secondary_cta' => $text(60),
            'trust_facts' => ['sometimes', 'nullable', 'list', 'max:3'],
            'trust_facts.*' => ['string', 'max:80'],
            'join_title' => $text(120),
            'join_description' => $text(500),
            'value_title' => $text(120),
            'value_subtitle' => $text(300),
            'about_paragraph_1' => $text(2000),
            'about_paragraph_2' => $text(2000),
            'about_chips' => ['sometimes', 'nullable', 'list', 'max:3'],
            'about_chips.*' => ['string', 'max:60'],
            'quick_facts' => ['sometimes', 'nullable', 'list', 'max:3'],
            'quick_facts.*' => ['array'],
            'quick_facts.*.value' => ['required', 'string', 'max:20'],
            'quick_facts.*.label' => ['required', 'string', 'max:80'],
            'services_title' => $text(120),
            'service_cards' => ['sometimes', 'nullable', 'list', 'max:4'],
            'service_cards.*' => ['array'],
            'service_cards.*.title' => ['required', 'string', 'max:80'],
            'service_cards.*.description' => ['required', 'string', 'max:300'],
            'service_cards.*.meta' => ['nullable', 'string', 'max:60'],
            'how_title' => $text(120),
            'how_description' => $text(300),
            'how_steps' => ['sometimes', 'nullable', 'list', 'max:4'],
            'how_steps.*' => ['array'],
            'how_steps.*.title' => ['required', 'string', 'max:80'],
            'how_steps.*.description' => ['required', 'string', 'max:300'],
            'how_steps.*.cta' => ['nullable', 'string', 'max:60'],
            'faq_title' => $text(120),
            'faq_items' => ['sometimes', 'nullable', 'list', 'max:12'],
            'faq_items.*' => ['array'],
            'faq_items.*.question' => ['required', 'string', 'max:200'],
            'faq_items.*.answer' => ['required', 'string', 'max:1000'],
            'cta_title' => $text(120),
            'cta_subtitle' => $text(200),
            'cta_button' => $text(60),
            'cta_note' => $text(120),
            'footer_about' => $text(300),
            'footer_tagline' => $text(120),
            'footer_copyright' => $text(200),
            'footer_supervision' => $text(200),
        ];
    }
}

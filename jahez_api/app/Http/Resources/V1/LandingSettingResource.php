<?php

namespace App\Http\Resources\V1;

use App\Models\LandingSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The landing-page content IMC edits. The shape is the same for visitors and
 * administrators: everything here is public by design. A null field means the
 * web client falls back to its bundled copy. The logo path is relative to
 * /api/v1; the version query changes with the record, so a replaced logo is
 * fetched again.
 *
 * @mixin LandingSetting
 */
class LandingSettingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $version = $this->updated_at?->getTimestamp() ?? 0;

        return [
            'logo_path' => ! $this->hasLogo() ? null : "/public/landing/logo?v={$version}",
            'hero_kicker' => $this->hero_kicker,
            'hero_headline' => $this->hero_headline,
            'hero_tab_headlines' => $this->hero_tab_headlines ?? (object) [],
            'hero_subtitle' => $this->hero_subtitle,
            'hero_primary_cta' => $this->hero_primary_cta,
            'hero_secondary_cta' => $this->hero_secondary_cta,
            'trust_facts' => $this->trust_facts ?? [],
            'join_title' => $this->join_title,
            'join_description' => $this->join_description,
            'value_title' => $this->value_title,
            'value_subtitle' => $this->value_subtitle,
            'about_paragraph_1' => $this->about_paragraph_1,
            'about_paragraph_2' => $this->about_paragraph_2,
            'about_chips' => $this->about_chips ?? [],
            'quick_facts' => $this->quick_facts ?? [],
            'services_title' => $this->services_title,
            'service_cards' => $this->service_cards ?? [],
            'how_title' => $this->how_title,
            'how_description' => $this->how_description,
            'how_steps' => $this->how_steps ?? [],
            'faq_title' => $this->faq_title,
            'faq_items' => $this->faq_items ?? [],
            'cta_title' => $this->cta_title,
            'cta_subtitle' => $this->cta_subtitle,
            'cta_button' => $this->cta_button,
            'cta_note' => $this->cta_note,
            'footer_about' => $this->footer_about,
            'footer_tagline' => $this->footer_tagline,
            'footer_copyright' => $this->footer_copyright,
            'footer_supervision' => $this->footer_supervision,
            'updated_at' => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}

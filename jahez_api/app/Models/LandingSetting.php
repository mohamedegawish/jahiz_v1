<?php

namespace App\Models;

use App\Http\Responses\StoredFileResponse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * The single row of landing-page content IMC edits (the logo, hero texts,
 * section texts and the FAQ). Every column stays null until an administrator
 * sets it; the web client falls back to its bundled copy for anything unset.
 *
 * @property int $id
 * @property string|null $logo_disk
 * @property string|null $logo_path
 * @property string|null $logo_mime_type
 * @property string|null $hero_kicker
 * @property string|null $hero_headline
 * @property array<string, string>|null $hero_tab_headlines
 * @property string|null $hero_subtitle
 * @property string|null $hero_primary_cta
 * @property string|null $hero_secondary_cta
 * @property list<string>|null $trust_facts
 * @property string|null $join_title
 * @property string|null $join_description
 * @property string|null $value_title
 * @property string|null $value_subtitle
 * @property string|null $about_paragraph_1
 * @property string|null $about_paragraph_2
 * @property list<string>|null $about_chips
 * @property list<array{value: string, label: string}>|null $quick_facts
 * @property string|null $services_title
 * @property list<array{title: string, description: string, meta: string|null}>|null $service_cards
 * @property string|null $how_title
 * @property string|null $how_description
 * @property list<array{title: string, description: string, cta: string|null}>|null $how_steps
 * @property string|null $faq_title
 * @property list<array{question: string, answer: string}>|null $faq_items
 * @property string|null $cta_title
 * @property string|null $cta_subtitle
 * @property string|null $cta_button
 * @property string|null $cta_note
 * @property string|null $footer_about
 * @property string|null $footer_tagline
 * @property string|null $footer_copyright
 * @property string|null $footer_supervision
 * @property int|null $ad_rotation_seconds
 */
class LandingSetting extends Model
{
    /**
     * The hero tabs whose headline an administrator edits (labels are the
     * client navigation and stay fixed).
     *
     * @var list<string>
     */
    public const HERO_TABS = ['home', 'assessment', 'digital', 'smart', 'results'];

    /**
     * The content fields an administrator edits. The logo file has its own actions.
     *
     * @var list<string>
     */
    protected $fillable = [
        'hero_kicker',
        'hero_headline',
        'hero_tab_headlines',
        'hero_subtitle',
        'hero_primary_cta',
        'hero_secondary_cta',
        'trust_facts',
        'join_title',
        'join_description',
        'value_title',
        'value_subtitle',
        'about_paragraph_1',
        'about_paragraph_2',
        'about_chips',
        'quick_facts',
        'services_title',
        'service_cards',
        'how_title',
        'how_description',
        'how_steps',
        'faq_title',
        'faq_items',
        'cta_title',
        'cta_subtitle',
        'cta_button',
        'cta_note',
        'footer_about',
        'footer_tagline',
        'footer_copyright',
        'footer_supervision',
        'ad_rotation_seconds',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'hero_tab_headlines' => 'array',
            'trust_facts' => 'array',
            'about_chips' => 'array',
            'quick_facts' => 'array',
            'service_cards' => 'array',
            'how_steps' => 'array',
            'faq_items' => 'array',
            'ad_rotation_seconds' => 'integer',
        ];
    }

    /**
     * The one row, or an empty unsaved copy when nobody edited the content yet.
     * Reading never writes: the row is created only by the first real update.
     */
    public static function singleton(): self
    {
        return self::query()->first() ?? new self;
    }

    public function hasLogo(): bool
    {
        return $this->logo_path !== null && $this->logo_disk !== null;
    }

    /**
     * The logo image inline, with the content type detected at upload. The caller
     * decides who may read it (SecurityHeaders lets shared caches keep only the public copies briefly).
     */
    public function logoResponse(): Response
    {
        return StoredFileResponse::inline((string) $this->logo_disk, (string) $this->logo_path, (string) $this->logo_mime_type);
    }

    public function deleteLogoFile(): void
    {
        if ($this->hasLogo()) {
            Storage::disk((string) $this->logo_disk)->delete((string) $this->logo_path);
        }
    }
}

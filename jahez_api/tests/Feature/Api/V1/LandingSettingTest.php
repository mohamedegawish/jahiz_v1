<?php

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\LandingSetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

/*
| Landing-page content: visitors read it without a token; IMC administrators
| with announcements.manage edit it and set the logo.
*/

beforeEach(function () {
    Storage::fake('local');
});

describe('public content', function () {
    it('shows visitors the settings with unset fields falling back to nulls and empty lists', function () {
        $this->getJson(route('api.v1.public.landing.show'))
            ->assertOk()
            ->assertJsonPath('data.logo_path', null)
            ->assertJsonPath('data.hero_headline', null)
            ->assertJsonPath('data.hero_tab_headlines', [])
            ->assertJsonPath('data.trust_facts', [])
            ->assertJsonPath('data.faq_items', [])
            ->assertJsonMissingPath('data.hero_tab_headlines.home');
    });

    it('serves the uploaded logo without a token, and 404s without one', function () {
        $this->get(route('api.v1.public.landing.logo'))->assertNotFound();

        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $this->post(route('api.v1.landing.logo.store'), ['file' => UploadedFile::fake()->image('logo.png', 400, 200)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.logo_path', fn (string $path): bool => str_starts_with($path, '/public/landing/logo?v='));

        app('auth')->forgetGuards();
        $this->get(route('api.v1.public.landing.logo'))->assertOk()->assertHeader('Content-Type', 'image/png');
    });
});

describe('IMC administration', function () {
    it('updates the fields sent and audits the field names only', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->putJson(route('api.v1.landing.update'), [
            'hero_headline' => 'عنوان جديد',
            'hero_tab_headlines' => ['home' => 'رئيسية جديدة'],
            'trust_facts' => ['ثقة أولى', 'ثقة ثانية'],
            'faq_items' => [['question' => 'س؟', 'answer' => 'ج.']],
        ])->assertOk()
            ->assertJsonPath('data.hero_headline', 'عنوان جديد')
            ->assertJsonPath('data.hero_tab_headlines.home', 'رئيسية جديدة')
            ->assertJsonPath('data.trust_facts', ['ثقة أولى', 'ثقة ثانية'])
            ->assertJsonPath('data.faq_items.0.question', 'س؟');

        expect(LandingSetting::query()->count())->toBe(1);

        $this->putJson(route('api.v1.landing.update'), ['footer_about' => 'نبذة التذييل'])->assertOk()
            ->assertJsonPath('data.hero_headline', 'عنوان جديد');

        $entries = AuditLog::query()->where('event', AuditEvent::LandingSettingsUpdated)->orderBy('id')->get();
        expect($entries)->toHaveCount(2)
            ->and($entries[0]->subject_type)->toBe('landing_setting')
            ->and($entries[0]->metadata)->toEqual(['fields' => ['faq_items', 'hero_headline', 'hero_tab_headlines', 'trust_facts']])
            ->and($entries[1]->metadata)->toEqual(['fields' => ['footer_about']])
            ->and(AuditLog::query()->get()->toJson())->not->toContain('عنوان جديد');
    });

    it('writes no audit entry for a no-op update', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->putJson(route('api.v1.landing.update'), ['hero_headline' => 'عنوان'])->assertOk();
        $this->putJson(route('api.v1.landing.update'), ['hero_headline' => 'عنوان'])->assertOk();

        expect(AuditLog::query()->where('event', AuditEvent::LandingSettingsUpdated)->count())->toBe(1);
    });

    it('restores the bundled copy with an explicit null', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->putJson(route('api.v1.landing.update'), ['hero_headline' => 'عنوان'])->assertOk();
        $this->putJson(route('api.v1.landing.update'), ['hero_headline' => null])->assertOk()
            ->assertJsonPath('data.hero_headline', null);
    });

    it('replaces and removes the logo, deleting the previous file', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->post(route('api.v1.landing.logo.store'), ['file' => UploadedFile::fake()->image('first.png', 400, 200)], ['Accept' => 'application/json'])->assertOk();
        $first = LandingSetting::singleton()->logo_path;
        expect($first)->not->toBeNull();

        $this->post(route('api.v1.landing.logo.store'), ['file' => UploadedFile::fake()->image('second.png', 400, 200)], ['Accept' => 'application/json'])->assertOk();
        $second = LandingSetting::singleton()->refresh()->logo_path;
        expect($second)->not->toBe($first);
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);

        $this->deleteJson(route('api.v1.landing.logo.destroy'))->assertOk()
            ->assertJsonPath('data.logo_path', null);
        Storage::disk('local')->assertMissing($second);
        $this->get(route('api.v1.public.landing.logo'))->assertNotFound();
    });

    it('rejects a logo of the wrong type or size', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->post(route('api.v1.landing.logo.store'), ['file' => UploadedFile::fake()->create('logo.txt', 10, 'text/plain')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->post(route('api.v1.landing.logo.store'), ['file' => UploadedFile::fake()->image('huge.png')->size(3000)], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
    });

    it('rejects out-of-shape content', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->putJson(route('api.v1.landing.update'), ['hero_headline' => str_repeat('ن', 121)])->assertUnprocessable()->assertJsonValidationErrors('hero_headline');

        $this->putJson(route('api.v1.landing.update'), [
            'faq_items' => array_fill(0, 13, ['question' => 'س؟', 'answer' => 'ج.']),
        ])->assertUnprocessable()->assertJsonValidationErrors('faq_items');

        $this->putJson(route('api.v1.landing.update'), [
            'service_cards' => array_fill(0, 5, ['title' => 'ت', 'description' => 'و']),
        ])->assertUnprocessable()->assertJsonValidationErrors('service_cards');

        $this->putJson(route('api.v1.landing.update'), [
            'quick_facts' => [['value' => '7']],
        ])->assertUnprocessable()->assertJsonValidationErrors('quick_facts.0.label');
    });

    it('hides the settings from anyone without announcements.manage', function () {
        $this->putJson(route('api.v1.landing.update'), ['hero_headline' => 'x'])->assertUnauthorized();

        Sanctum::actingAs(User::factory()->factoryMember()->create());
        $this->putJson(route('api.v1.landing.update'), ['hero_headline' => 'x'])->assertNotFound();
        $this->post(route('api.v1.landing.logo.store'), ['file' => UploadedFile::fake()->image('logo.png')], ['Accept' => 'application/json'])->assertNotFound();
        $this->deleteJson(route('api.v1.landing.logo.destroy'))->assertNotFound();

        expect(LandingSetting::query()->count())->toBe(0);
    });
});

// Finding PA-15: the ad rotation period lived in the administrator's browser storage, so
// visitors always got the default. It is a landing setting now.
describe('ad rotation period', function () {
    it('is set by IMC and given to every visitor', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $this->putJson(route('api.v1.landing.update'), ['ad_rotation_seconds' => 9])
            ->assertOk()
            ->assertJsonPath('data.ad_rotation_seconds', 9);

        app('auth')->forgetGuards();
        $this->getJson(route('api.v1.public.landing.show'))->assertOk()->assertJsonPath('data.ad_rotation_seconds', 9);

        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $this->putJson(route('api.v1.landing.update'), ['ad_rotation_seconds' => null])->assertOk()->assertJsonPath('data.ad_rotation_seconds', null);
    });

    it('accepts only whole seconds from 2 to 120', function (mixed $seconds) {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->putJson(route('api.v1.landing.update'), ['ad_rotation_seconds' => $seconds])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ad_rotation_seconds']);
    })->with([1, 121, 2.5, 'fast']);
});

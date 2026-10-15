<?php

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\PublicAnnouncement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

/*
| Landing-page announcements (ADR-022): IMC drafts, publishes and orders them; visitors
| read the live ones without a token.
*/

beforeEach(function () {
    Storage::fake('local');
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function announcementPayload(array $overrides = []): array
{
    return [
        'title' => 'ورشة الصناعة الذكية',
        'description' => 'جلسة تعريفية بربط أنظمة ERP بخطوط الإنتاج.',
        'color' => 'green',
        'badge_text' => '5 نوفمبر 2026',
        'link_path' => '/register/factory',
        'tags' => ['ورشة', 'ERP'],
        ...$overrides,
    ];
}

/**
 * @param  array<string, mixed>  $attributes
 */
function storedAnnouncement(array $attributes = [], bool $published = true): PublicAnnouncement
{
    $announcement = new PublicAnnouncement([...announcementPayload(), ...$attributes]);
    $announcement->published_at = $published ? now()->subMinute() : null;
    $announcement->save();

    return $announcement;
}

describe('public feed', function () {
    it('shows visitors only live announcements, in display order, with public fields only', function () {
        $second = storedAnnouncement(['title' => 'Second', 'sort_order' => 2]);
        $first = storedAnnouncement(['title' => 'First', 'sort_order' => 1]);
        storedAnnouncement(['title' => 'Draft'], published: false);
        storedAnnouncement(['title' => 'Scheduled', 'starts_at' => now()->addDay()]);
        storedAnnouncement(['title' => 'Ended', 'ends_at' => now()->subMinute()]);

        $this->getJson(route('api.v1.public.announcements.index'))
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $first->id)
            ->assertJsonPath('data.1.id', $second->id)
            ->assertJsonPath('data.0.link_path', '/register/factory')
            ->assertJsonMissingPath('data.0.state')
            ->assertJsonMissingPath('data.0.published_at');
    });

    it('answers 404 for an announcement that is not live, and for its cover', function () {
        $draft = storedAnnouncement([], published: false);

        $this->getJson(route('api.v1.public.announcements.show', $draft))->assertNotFound();
        $this->get(route('api.v1.public.announcements.cover', $draft))->assertNotFound();
    });

    it('serves a live announcement\'s cover image without a token', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $announcement = storedAnnouncement();
        $this->post(route('api.v1.announcements.cover.store', $announcement), ['file' => UploadedFile::fake()->image('cover.png', 600, 340)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.cover_path', fn (string $path): bool => str_starts_with($path, "/announcements/{$announcement->id}/cover"));

        app('auth')->forgetGuards();
        $this->getJson(route('api.v1.public.announcements.index'))
            ->assertJsonPath('data.0.cover_path', fn (string $path): bool => str_starts_with($path, "/public/announcements/{$announcement->id}/cover"));
        $this->get(route('api.v1.public.announcements.cover', $announcement))->assertOk()->assertHeader('Content-Type', 'image/png');
    });

    it('serves the hero video placement publicly once published with a video', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $id = $this->postJson(route('api.v1.announcements.store'), announcementPayload(['placement' => 'hero']))
            ->assertCreated()
            ->assertJsonPath('data.placement', 'hero')
            ->json('data.id');

        // A draft hero is invisible to visitors.
        $this->getJson(route('api.v1.public.announcements.index', ['placement' => 'hero']))->assertJsonCount(0, 'data');

        $this->post(route('api.v1.announcements.video.store', $id), [
            // Minimal ftyp header so the content-based mime guesser sees video/mp4.
            'file' => UploadedFile::fake()->createWithContent('hero.mp4', "\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41".str_repeat("\x00", 2048)),
        ], ['Accept' => 'application/json'])->assertOk();
        $this->postJson(route('api.v1.announcements.publish', $id))->assertOk();

        app('auth')->forgetGuards();
        $this->getJson(route('api.v1.public.announcements.index', ['placement' => 'hero']))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.video_path', fn (string $path): bool => str_starts_with($path, "/public/announcements/{$id}/video"));
        $this->get(route('api.v1.public.announcements.video', $id))->assertOk();
    });

    it('rejects an unknown placement', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->postJson(route('api.v1.announcements.store'), announcementPayload(['placement' => 'sidebar']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['placement']);
    });
});

describe('administration', function () {
    it('creates a draft that visitors do not see until it is published, and audits each step', function () {
        $admin = User::factory()->imcAdmin()->create();
        Sanctum::actingAs($admin);

        $id = $this->postJson(route('api.v1.announcements.store'), announcementPayload())
            ->assertCreated()
            ->assertJsonPath('data.state', 'draft')
            ->json('data.id');
        $this->getJson(route('api.v1.public.announcements.index'))->assertJsonCount(0, 'data');

        $this->postJson(route('api.v1.announcements.publish', $id))->assertOk()->assertJsonPath('data.state', 'live');
        $this->postJson(route('api.v1.announcements.publish', $id))->assertConflict();
        $this->getJson(route('api.v1.public.announcements.index'))->assertJsonCount(1, 'data');

        $this->patchJson(route('api.v1.announcements.update', $id), ['title' => 'Renamed', 'sort_order' => 5])->assertOk()->assertJsonPath('data.title', 'Renamed');
        $this->deleteJson(route('api.v1.announcements.destroy', $id))->assertConflict();
        $this->postJson(route('api.v1.announcements.unpublish', $id))->assertOk()->assertJsonPath('data.state', 'draft');
        $this->deleteJson(route('api.v1.announcements.destroy', $id))->assertNoContent();

        expect(AuditLog::query()->orderBy('id')->pluck('event')->map->value->all())->toBe([
            AuditEvent::AnnouncementCreated->value,
            AuditEvent::AnnouncementPublished->value,
            AuditEvent::AnnouncementUpdated->value,
            AuditEvent::AnnouncementUnpublished->value,
            AuditEvent::AnnouncementDeleted->value,
        ])->and(AuditLog::query()->where('event', AuditEvent::AnnouncementUpdated)->sole()->metadata)->toEqual(['fields' => ['sort_order', 'title']]);
    });

    it('accepts only links inside the platform and validates the content', function (array $payload, string $field) {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());

        $this->postJson(route('api.v1.announcements.store'), announcementPayload($payload))->assertUnprocessable()->assertJsonValidationErrors($field);
    })->with([
        'external link' => [['link_path' => 'https://evil.example/login'], 'link_path'],
        'protocol-relative link' => [['link_path' => '//evil.example'], 'link_path'],
        'script link' => [['link_path' => 'javascript:alert(1)'], 'link_path'],
        'unknown colour' => [['color' => 'pink'], 'color'],
        'missing title' => [['title' => ''], 'title'],
        'too many tags' => [['tags' => ['1', '2', '3', '4', '5', '6']], 'tags'],
        'end before start' => [['starts_at' => '2026-12-01', 'ends_at' => '2026-11-01'], 'ends_at'],
    ]);

    it('refuses an end before the start on a partial update', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $announcement = storedAnnouncement(['starts_at' => '2026-12-01 00:00:00']);

        $this->patchJson(route('api.v1.announcements.update', $announcement), ['ends_at' => '2026-11-01'])->assertUnprocessable()->assertJsonValidationErrors('ends_at');
    });

    it('refuses a cover that is not an image', function () {
        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $announcement = storedAnnouncement();

        $this->post(route('api.v1.announcements.cover.store', $announcement), ['file' => UploadedFile::fake()->create('cover.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable();
    });

    it('is for IMC only', function (Closure $actor) {
        $announcement = storedAnnouncement([], published: false);
        Sanctum::actingAs($actor());

        $this->getJson(route('api.v1.announcements.index'))->assertForbidden();
        $this->postJson(route('api.v1.announcements.store'), announcementPayload())->assertForbidden();
        $this->patchJson(route('api.v1.announcements.update', $announcement), ['title' => 'x'])->assertNotFound();
        $this->postJson(route('api.v1.announcements.publish', $announcement))->assertNotFound();
    })->with([
        'factory member' => [fn () => User::factory()->factoryMember()->create()],
        'provider member' => [fn () => User::factory()->providerMember()->create()],
    ]);

    it('needs a token for the administration routes', function () {
        $this->getJson(route('api.v1.announcements.index'))->assertUnauthorized();
    });
});

/**
 * A published hero announcement with an uploaded mp4 of $size bytes.
 */
function publishedHeroVideo(int $size = 4096): int
{
    Sanctum::actingAs(User::factory()->imcAdmin()->create());
    $id = test()->postJson(route('api.v1.announcements.store'), announcementPayload(['placement' => 'hero']))->assertCreated()->json('data.id');
    $content = "\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41";
    test()->post(route('api.v1.announcements.video.store', $id), [
        'file' => UploadedFile::fake()->createWithContent('hero.mp4', $content.str_repeat("\x00", $size - strlen($content))),
    ], ['Accept' => 'application/json'])->assertOk();
    test()->postJson(route('api.v1.announcements.publish', $id))->assertOk();
    app('auth')->forgetGuards();

    return $id;
}

describe('public media (production audit)', function () {
    // PA-26: Safari and iOS play a <video> only from a server that answers byte ranges.
    it('answers a byte range of a public video', function () {
        $id = publishedHeroVideo(4096);

        $this->get(route('api.v1.public.announcements.video', $id), ['Range' => 'bytes=0-99'])
            ->assertStatus(206)
            ->assertHeader('Accept-Ranges', 'bytes')
            ->assertHeader('Content-Range', 'bytes 0-99/4096')
            ->assertHeader('Content-Length', '100')
            // The type detected from the bytes at upload, never the file name's.
            ->assertHeader('Content-Type', PublicAnnouncement::query()->findOrFail($id)->video_mime_type);
    });

    // PA-21: the public media is the same for every visitor; it may be kept briefly.
    it('lets caches keep public media briefly, and nothing else', function () {
        $id = publishedHeroVideo();

        $public = $this->get(route('api.v1.public.announcements.video', $id))->assertOk();
        expect($public->headers->getCacheControlDirective('public'))->toBeTrue()
            ->and($public->headers->getCacheControlDirective('max-age'))->toBe('300');

        $json = $this->getJson(route('api.v1.public.announcements.index'))->assertOk();
        expect($json->headers->get('Cache-Control'))->toContain('no-store');

        Sanctum::actingAs(User::factory()->imcAdmin()->create());
        $preview = $this->get(route('api.v1.announcements.video', $id))->assertOk();
        expect($preview->headers->get('Cache-Control'))->toContain('no-store');
    });

    it('answers 404, not 500, when a recorded file is missing', function () {
        $announcement = storedAnnouncement();
        $announcement->video_disk = 'local';
        $announcement->video_path = 'announcements/gone.mp4';
        $announcement->video_mime_type = 'video/mp4';
        $announcement->save();

        $this->get(route('api.v1.public.announcements.video', $announcement))->assertNotFound();
    });
});

// PA-22: the hero-video page read the first 30 announcements of every placement and could
// miss the hero record; IMC can list one placement.
it('lists one placement for IMC', function () {
    storedAnnouncement(['title' => 'Top banner', 'placement' => 'top']);
    $hero = storedAnnouncement(['title' => 'Hero', 'placement' => 'hero']);
    Sanctum::actingAs(User::factory()->imcAdmin()->create());

    $this->getJson(route('api.v1.announcements.index', ['filter' => ['placement' => 'hero']]))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $hero->id);
    $this->getJson(route('api.v1.announcements.index', ['filter' => ['placement' => 'sidebar']]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['filter.placement']);
});

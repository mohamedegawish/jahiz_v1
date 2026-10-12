<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SaveLandingSettingRequest;
use App\Http\Resources\V1\LandingSettingResource;
use App\Models\AuditLog;
use App\Models\LandingSetting;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * The landing-page content (the logo, hero texts, section texts and the FAQ).
 * Visitors read it without a token; IMC administrators with announcements.manage
 * edit it and set the logo. Every change is audited (field names only).
 */
class LandingSettingController extends Controller
{
    // ─── Public ───

    public function show(): LandingSettingResource
    {
        return new LandingSettingResource(LandingSetting::singleton());
    }

    /**
     * The platform logo, when an administrator uploaded one.
     */
    public function logo(): StreamedResponse
    {
        $settings = LandingSetting::singleton();
        abort_unless($settings->hasLogo(), 404);

        return $settings->logoResponse();
    }

    // ─── IMC administration ───

    /**
     * Set the fields sent; an explicit null restores the web client's bundled
     * copy for that field. The change is visible at once.
     */
    public function update(SaveLandingSettingRequest $request, #[CurrentUser] User $user): LandingSettingResource
    {
        DB::transaction(function () use ($request, $user): void {
            // Created inside the write transaction only: reads and rejected
            // requests never leave a row behind.
            $locked = LandingSetting::query()->lockForUpdate()->first() ?? new LandingSetting;
            $locked->fill($request->validated());
            $changed = array_keys($locked->getDirty());

            if ($changed === []) {
                return;
            }

            sort($changed);
            $locked->save();
            AuditLog::record(AuditEvent::LandingSettingsUpdated, $user, $locked, ['fields' => $changed]);
        });

        return new LandingSettingResource(LandingSetting::singleton());
    }

    /**
     * Set or replace the platform logo (jpg, png, webp; the logo size limit).
     * Raster images only: an SVG could carry scripts to visitors. The previous
     * file is deleted once the new one is recorded.
     */
    public function storeLogo(Request $request, #[CurrentUser] User $user): LandingSettingResource
    {
        Gate::authorize('update', LandingSetting::singleton());
        $request->validate([
            'file' => ['required', 'file', 'mimes:'.implode(',', (array) config('jahez.documents.logo_mimes')), 'max:'.(int) config('jahez.documents.logo_max_kb')],
        ]);

        $file = $request->file('file');
        abort_unless($file instanceof UploadedFile, 422, 'Send one file.');

        $disk = (string) config('jahez.documents.disk');
        $extension = strtolower($file->guessExtension() ?? $file->extension());
        $path = Storage::disk($disk)->putFileAs('landing', $file, Str::uuid()->toString().'.'.$extension);
        abort_if($path === false, 500, 'The uploaded file could not be stored.');

        $previous = null;
        try {
            DB::transaction(function () use ($user, $disk, $path, $file, &$previous): void {
                $locked = LandingSetting::query()->lockForUpdate()->first() ?? new LandingSetting;
                $previous = $locked->exists && $locked->hasLogo() ? clone $locked : null;
                $locked->logo_disk = $disk;
                $locked->logo_path = $path;
                $locked->logo_mime_type = (string) $file->getMimeType();
                $locked->save();
                AuditLog::record(AuditEvent::LandingSettingsUpdated, $user, $locked, ['fields' => ['logo']]);
            });
        } catch (Throwable $exception) {
            Storage::disk($disk)->delete($path);

            throw $exception;
        }
        $previous?->deleteLogoFile();

        return new LandingSettingResource(LandingSetting::singleton());
    }

    /**
     * Remove the logo: visitors see the bundled mark again.
     */
    public function destroyLogo(#[CurrentUser] User $user): LandingSettingResource
    {
        Gate::authorize('update', LandingSetting::singleton());

        $previous = DB::transaction(function () use ($user): ?LandingSetting {
            $locked = LandingSetting::query()->lockForUpdate()->first();
            if ($locked === null || ! $locked->hasLogo()) {
                return null;
            }
            $previous = clone $locked;
            $locked->logo_disk = null;
            $locked->logo_path = null;
            $locked->logo_mime_type = null;
            $locked->save();
            AuditLog::record(AuditEvent::LandingSettingsUpdated, $user, $locked, ['fields' => ['logo']]);

            return $previous;
        });
        $previous?->deleteLogoFile();

        return new LandingSettingResource(LandingSetting::singleton());
    }
}

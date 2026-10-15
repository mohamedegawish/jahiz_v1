<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * An uploaded image or video shown inline (landing logo, announcement covers and videos).
 *
 * On a local disk the file is sent as a BinaryFileResponse, which answers HTTP Range
 * requests (206) and sends Last-Modified: browsers seek in a video and Safari/iOS play it
 * at all only with byte ranges (finding PA-26). Other disks stream the whole file.
 * The content type is the one detected when the file was uploaded, never the file name's.
 */
final class StoredFileResponse
{
    public static function inline(string $disk, string $path, string $mimeType): Response
    {
        // A record whose file is gone (a lost volume, a manual deletion) is a 404, not a 500.
        abort_unless(Storage::disk($disk)->exists($path), Response::HTTP_NOT_FOUND);

        if (Config::get("filesystems.disks.{$disk}.driver") === 'local') {
            $response = new BinaryFileResponse(Storage::disk($disk)->path($path), Response::HTTP_OK, ['Content-Type' => $mimeType]);

            return $response->setContentDisposition('inline', basename($path));
        }

        return Storage::disk($disk)->response($path, null, ['Content-Type' => $mimeType], 'inline');
    }
}

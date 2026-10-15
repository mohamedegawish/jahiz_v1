<?php

use App\Http\Requests\Api\V1\SavePublicAnnouncementRequest;

// An announcement link is a path inside the web client (ADR-022): never another site, a
// scheme, or text after the path. Finding PA-29: `$` also matched before a final newline.
it('accepts paths inside the web client', function (string $link) {
    expect(preg_match(SavePublicAnnouncementRequest::LINK_PATTERN, $link))->toBe(1);
})->with([
    '/register/factory',
    '/ads/12',
    '/use-cases?tab=video',
]);

it('refuses anything else, a trailing newline included', function (string $link) {
    expect(preg_match(SavePublicAnnouncementRequest::LINK_PATTERN, $link))->toBe(0);
})->with([
    'another site' => '//evil.example',
    'a scheme' => 'javascript:alert(1)',
    'an absolute URL' => 'https://evil.example',
    'a backslash' => '/\\evil.example',
    'a trailing newline' => "/register/factory\n",
]);

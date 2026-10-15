<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline security headers (Phase 9). API responses get a deny-all
 * Content-Security-Policy and are never stored by caches; HSTS is sent only on HTTPS
 * requests (as seen through trusted proxies).
 *
 * Exception (finding PA-21): the public landing media (the logo, live announcement
 * covers and videos) is the same for every visitor and needs no token, so a successful
 * answer may be kept for a few minutes instead of downloading a video on every visit.
 * A change shows within that time; the logo URL also carries a version.
 */
class SecurityHeaders
{
    /** @var list<string> */
    public const PUBLIC_MEDIA_ROUTES = [
        'api.v1.public.landing.logo',
        'api.v1.public.announcements.cover',
        'api.v1.public.announcements.video',
    ];

    public const PUBLIC_MEDIA_CACHE_CONTROL = 'public, max-age=300';

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');

        if ($request->is('api', 'api/*')) {
            $response->headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
            $response->headers->set('Cache-Control', $this->isPublicMedia($request, $response) ? self::PUBLIC_MEDIA_CACHE_CONTROL : 'no-store, private');
        }

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }

    /**
     * A successful GET of public landing media: never an error, an admin preview or JSON.
     */
    private function isPublicMedia(Request $request, Response $response): bool
    {
        return $request->isMethod('GET')
            && in_array($response->getStatusCode(), [Response::HTTP_OK, Response::HTTP_PARTIAL_CONTENT], true)
            && $request->routeIs(...self::PUBLIC_MEDIA_ROUTES);
    }
}

<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// The web client's nginx (front/docker/nginx.conf) serves the API on the frontend's own
// origin and forwards /api/ to this app over the Docker network. With TRUSTED_PROXIES=*
// (the production value) the app trusts only that nginx (REMOTE_ADDR), so these tests send
// exactly the headers it sets: X-Forwarded-For ends with the client address nginx took from
// the Coolify proxy, and the scheme, host and port are the browser's.

const NGINX_ADDRESS = '172.18.0.7';

/**
 * @return array<string, string>
 */
function forwardedByNginx(string $client): array
{
    return [
        'Host' => 'www.example.org',
        'X-Real-IP' => $client,
        'X-Forwarded-For' => "{$client}, {$client}",
        'X-Forwarded-Proto' => 'https',
        'X-Forwarded-Host' => 'www.example.org',
        'X-Forwarded-Port' => '443',
    ];
}

beforeEach(function () {
    config(['trustedproxy.proxies' => '*']);
    Route::middleware('api')->get('api/v1/__test/proxied', fn (Request $request) => [
        'ip' => $request->ip(),
        'secure' => $request->isSecure(),
        'root' => $request->root(),
    ]);
});

it('sees the browser\'s client address, scheme and host through the web client\'s nginx', function () {
    $this->withServerVariables(['REMOTE_ADDR' => NGINX_ADDRESS])
        ->getJson('/api/v1/__test/proxied', forwardedByNginx('203.0.113.5'))
        ->assertOk()
        ->assertExactJson(['ip' => '203.0.113.5', 'secure' => true, 'root' => 'https://www.example.org'])
        ->assertHeader('Strict-Transport-Security');
});

it('limits each client behind the web client\'s nginx separately', function () {
    config(['api.rate_limit_per_minute' => 1]);

    $this->withServerVariables(['REMOTE_ADDR' => NGINX_ADDRESS])
        ->getJson('/api/v1/__test/proxied', forwardedByNginx('203.0.113.5'))
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => NGINX_ADDRESS])
        ->getJson('/api/v1/__test/proxied', forwardedByNginx('203.0.113.6'))
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => NGINX_ADDRESS])
        ->getJson('/api/v1/__test/proxied', forwardedByNginx('203.0.113.5'))
        ->assertTooManyRequests();
});

it('ignores an address a client wrote into X-Forwarded-For itself', function () {
    // nginx appends the address it resolved; a forged left-most entry must not win.
    $headers = ['X-Forwarded-For' => '198.51.100.1, 203.0.113.5'] + forwardedByNginx('203.0.113.5');

    $this->withServerVariables(['REMOTE_ADDR' => NGINX_ADDRESS])
        ->getJson('/api/v1/__test/proxied', $headers)
        ->assertJsonPath('ip', '203.0.113.5');
});

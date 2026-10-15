<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware('api')->get('api/v1/__test/limited', fn () => ['ok' => true]);
});

it('rejects requests over the per-minute limit with the error envelope', function () {
    config(['api.rate_limit_per_minute' => 2]);

    $this->getJson('/api/v1/__test/limited')->assertOk();
    $this->getJson('/api/v1/__test/limited')->assertOk();

    $response = $this->getJson('/api/v1/__test/limited');

    $response->assertTooManyRequests()
        ->assertJsonPath('code', 'too_many_requests')
        ->assertJsonPath('message', 'Too many requests.')
        ->assertHeader('Retry-After');
});

it('counts guests separately by IP address', function () {
    config(['api.rate_limit_per_minute' => 1]);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
        ->getJson('/api/v1/__test/limited')
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
        ->getJson('/api/v1/__test/limited')
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
        ->getJson('/api/v1/__test/limited')
        ->assertTooManyRequests();
});

it('limits each client behind a trusted proxy separately', function () {
    config([
        'api.rate_limit_per_minute' => 1,
        'trustedproxy.proxies' => '10.0.0.10',
    ]);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->getJson('/api/v1/__test/limited', ['X-Forwarded-For' => '203.0.113.5'])
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->getJson('/api/v1/__test/limited', ['X-Forwarded-For' => '203.0.113.6'])
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->getJson('/api/v1/__test/limited', ['X-Forwarded-For' => '203.0.113.5'])
        ->assertTooManyRequests();
});

it('ignores forwarded addresses from untrusted callers so limits cannot be dodged', function () {
    config([
        'api.rate_limit_per_minute' => 1,
        'trustedproxy.proxies' => null,
    ]);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
        ->getJson('/api/v1/__test/limited', ['X-Forwarded-For' => '203.0.113.5'])
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
        ->getJson('/api/v1/__test/limited', ['X-Forwarded-For' => '203.0.113.99'])
        ->assertTooManyRequests();
});

// Finding PA-35: the web client alone made 72 calls in one minute while an administrator
// moved through about ten portal pages, so the shared limit of 60 showed 429 error states.
// Signed-in accounts have their own, higher limit, keyed by the account; guests keep theirs.
it('gives signed-in accounts their own limit, keyed by the account', function () {
    config(['api.rate_limit_per_minute' => 1, 'api.user_rate_limit_per_minute' => 3]);
    Route::middleware(['api', 'auth:sanctum'])->get('api/v1/__test/limited-user', fn () => ['ok' => true]);
    $member = User::factory()->create();
    $token = bearerTokenFor($member);

    foreach (range(1, 3) as $request) {
        $this->withToken($token)->getJson('/api/v1/__test/limited-user')->assertOk();
    }
    $this->withToken($token)->getJson('/api/v1/__test/limited-user')->assertTooManyRequests();

    // The same address as a guest is counted apart, with the guest limit.
    app('auth')->forgetGuards();
    $this->flushHeaders();
    $this->getJson('/api/v1/__test/limited')->assertOk();
    $this->getJson('/api/v1/__test/limited')->assertTooManyRequests();
});

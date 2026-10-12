<?php

use App\Models\LandingSetting;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

test('record decisions for each actor', function (Closure $actor, string $ability, string $expectedDecision) {
    $settings = LandingSetting::singleton();

    $response = Gate::forUser($actor())->inspect($ability, $settings);

    expect($response->allowed() ? 'allow' : 'deny '.($response->status() ?? 403))->toBe($expectedDecision);
})->with([
    [fn () => User::factory()->imcAdmin()->create(), 'update', 'allow'],
    [fn () => User::factory()->factoryMember()->create(), 'update', 'deny 404'],
    [fn () => User::factory()->providerMember()->create(), 'update', 'deny 404'],
]);

<?php

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\AccountPasswordController;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/*
| Finding PA-12: a signed-in account could change its password only through the emailed
| reset link, which self-registered accounts (no email round-trip, ADR-028) may never
| receive. PUT /me/password needs the current password, applies the platform policy and
| signs out every other device. Finding PA-27: POST /auth/logout-all signs out all of them.
*/

function passwordChange(string $current, string $new, ?string $confirmation = null): array
{
    return ['current_password' => $current, 'password' => $new, 'password_confirmation' => $confirmation ?? $new];
}

describe('changing the password', function () {
    it('changes the password and signs out every other device, keeping this one', function () {
        $user = User::factory()->create(['password' => 'the old passphrase']);
        $thisDevice = bearerTokenFor($user);
        $otherDevice = bearerTokenFor($user);

        $this->withToken($thisDevice)
            ->putJson(route('api.v1.me.password.update'), passwordChange('the old passphrase', 'a much better passphrase'))
            ->assertOk()
            ->assertExactJson(['data' => ['message' => AccountPasswordController::RESPONSE_MESSAGE]]);

        expect(Hash::check('a much better passphrase', $user->refresh()->password))->toBeTrue();
        forgetResolvedUsers();
        $this->withToken($thisDevice)->getJson(route('api.v1.me'))->assertOk();
        forgetResolvedUsers();
        $this->withToken($otherDevice)->getJson(route('api.v1.me'))->assertUnauthorized();
    });

    it('refuses a wrong current password and changes nothing', function () {
        $user = User::factory()->create(['password' => 'the old passphrase']);
        $otherDevice = bearerTokenFor($user);

        $this->withToken(bearerTokenFor($user))
            ->putJson(route('api.v1.me.password.update'), passwordChange('a guessed passphrase', 'a much better passphrase'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);

        expect(Hash::check('the old passphrase', $user->refresh()->password))->toBeTrue();
        forgetResolvedUsers();
        $this->withToken($otherDevice)->getJson(route('api.v1.me'))->assertOk();
        expect(AuditLog::query()->where('event', AuditEvent::PasswordChanged)->count())->toBe(0);
    });

    it('applies the platform password policy and requires a confirmation and a new password', function (array $payload, string $field) {
        $user = User::factory()->create(['password' => 'the old passphrase']);

        $this->withToken(bearerTokenFor($user))
            ->putJson(route('api.v1.me.password.update'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field]);
    })->with([
        'eleven characters' => [passwordChange('the old passphrase', 'elevenchars'), 'password'],
        'over 72 bytes' => [passwordChange('the old passphrase', str_repeat('ك', 37)), 'password'],
        'unconfirmed' => [passwordChange('the old passphrase', 'a much better passphrase', 'something else entirely'), 'password'],
        'unchanged' => [passwordChange('the old passphrase', 'the old passphrase'), 'password'],
        'no current password' => [['password' => 'a much better passphrase', 'password_confirmation' => 'a much better passphrase'], 'current_password'],
    ]);

    it('records the change without any secret', function () {
        $user = User::factory()->create(['password' => 'the old passphrase']);
        bearerTokenFor($user);

        $this->withToken(bearerTokenFor($user))
            ->putJson(route('api.v1.me.password.update'), passwordChange('the old passphrase', 'a much better passphrase'))
            ->assertOk();

        $entry = AuditLog::query()->where('event', AuditEvent::PasswordChanged)->sole();
        expect($entry->actor_user_id)->toBe($user->id)
            ->and($entry->metadata)->toEqual(['other_credentials_revoked' => 1])
            ->and(json_encode($entry->metadata))->not->toContain('passphrase');
    });

    it('limits attempts at the current password per account', function () {
        $user = User::factory()->create(['password' => 'the old passphrase']);
        $token = bearerTokenFor($user);

        foreach (range(1, 5) as $attempt) {
            $this->withToken($token)
                ->putJson(route('api.v1.me.password.update'), passwordChange("guess number {$attempt}", 'a much better passphrase'))
                ->assertUnprocessable();
        }

        $this->withToken($token)
            ->putJson(route('api.v1.me.password.update'), passwordChange('the old passphrase', 'a much better passphrase'))
            ->assertTooManyRequests();
        expect(Hash::check('the old passphrase', $user->refresh()->password))->toBeTrue();
    });

    it('needs a signed-in account', function () {
        $this->putJson(route('api.v1.me.password.update'), passwordChange('x', 'a much better passphrase'))->assertUnauthorized();
    });
});

describe('signing out everywhere', function () {
    it('revokes every token of the account, this one included, and nobody else\'s', function () {
        $user = User::factory()->create();
        $thisDevice = bearerTokenFor($user);
        $otherDevice = bearerTokenFor($user);
        $someoneElse = bearerTokenFor(User::factory()->create());

        $this->withToken($thisDevice)->postJson(route('api.v1.auth.logout-all'))->assertNoContent();

        foreach ([$thisDevice, $otherDevice] as $token) {
            forgetResolvedUsers();
            $this->withToken($token)->getJson(route('api.v1.me'))->assertUnauthorized();
        }
        forgetResolvedUsers();
        $this->withToken($someoneElse)->getJson(route('api.v1.me'))->assertOk();

        expect(AuditLog::query()->where('event', AuditEvent::LoggedOutEverywhere)->sole()->metadata)->toEqual(['credentials_revoked' => 2]);
    });

    it('needs a signed-in account', function () {
        $this->postJson(route('api.v1.auth.logout-all'))->assertUnauthorized();
    });
});

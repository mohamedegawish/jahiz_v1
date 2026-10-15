<?php

use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('creates a verified IMC administrator with the prompted password', function () {
    $this->artisan('app:create-admin', ['email' => 'admin@example.test', 'name' => 'Platform Admin'])
        ->expectsQuestion('Password', 'a-strong-passphrase')
        ->expectsQuestion('Confirm password', 'a-strong-passphrase')
        ->expectsOutputToContain('IMC administrator admin@example.test created.')
        ->assertSuccessful();

    $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
    expect($admin->role)->toBe(Role::ImcAdmin)
        ->and($admin->factory_id)->toBeNull()
        ->and($admin->email_verified_at)->not->toBeNull()
        ->and(Hash::check('a-strong-passphrase', $admin->password))->toBeTrue();
});

it('reads the password from the named environment variable on an unattended start', function () {
    putenv('TEST_INITIAL_ADMIN_PASSWORD=a-strong-passphrase');

    try {
        $this->artisan('app:create-admin', ['email' => 'admin@example.test', 'name' => 'Platform Admin', '--password-env' => 'TEST_INITIAL_ADMIN_PASSWORD', '--no-interaction' => true])
            ->expectsOutputToContain('IMC administrator admin@example.test created.')
            ->assertSuccessful()
            ->run();
    } finally {
        putenv('TEST_INITIAL_ADMIN_PASSWORD');
    }

    $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
    expect($admin->role)->toBe(Role::ImcAdmin)
        ->and(Hash::check('a-strong-passphrase', $admin->password))->toBeTrue();
});

it('refuses an empty password environment variable and creates nothing', function () {
    $this->artisan('app:create-admin', ['email' => 'admin@example.test', 'name' => 'Platform Admin', '--password-env' => 'TEST_UNSET_ADMIN_PASSWORD', '--no-interaction' => true])
        ->expectsOutputToContain('The environment variable TEST_UNSET_ADMIN_PASSWORD is empty or not set.')
        ->assertFailed();

    $this->assertDatabaseMissing('users', ['email' => 'admin@example.test']);
});

it('leaves an existing account untouched with --if-missing', function () {
    $existing = User::factory()->create(['email' => 'admin@example.test']);
    $passwordHash = $existing->password;

    $this->artisan('app:create-admin', ['email' => 'admin@example.test', 'name' => 'Platform Admin', '--if-missing' => true, '--no-interaction' => true])
        ->expectsOutputToContain('An account for admin@example.test already exists; nothing was created.')
        ->assertSuccessful();

    expect(User::query()->where('email', 'admin@example.test')->count())->toBe(1)
        ->and($existing->fresh()?->password)->toBe($passwordHash)
        ->and($existing->fresh()?->role)->toBe($existing->role);
});

it('creates no administrator when the audit entry cannot be written', function () {
    AuditLog::creating(fn (): never => throw new RuntimeException('Audit store unavailable.'));

    expect(fn () => $this->artisan('app:create-admin', ['email' => 'admin@example.test', 'name' => 'Platform Admin'])
        ->expectsQuestion('Password', 'a-strong-passphrase')
        ->expectsQuestion('Confirm password', 'a-strong-passphrase')
        ->run())->toThrow(RuntimeException::class, 'Audit store unavailable.');

    $this->assertDatabaseMissing('users', ['email' => 'admin@example.test']);
});

it('refuses invalid input and creates nothing', function (string $email, string $password, string $confirmation, string $error) {
    User::factory()->create(['email' => 'taken@example.test']);

    $this->artisan('app:create-admin', ['email' => $email, 'name' => 'Platform Admin'])
        ->expectsQuestion('Password', $password)
        ->expectsQuestion('Confirm password', $confirmation)
        ->expectsOutputToContain($error)
        ->assertFailed();

    expect(User::query()->where('role', Role::ImcAdmin)->count())->toBe(0);
})->with([
    'mismatched confirmation' => ['admin@example.test', 'a-strong-passphrase', 'something-else-entirely', 'The password field confirmation does not match.'],
    'password shorter than 12 characters' => ['admin@example.test', 'short-pass', 'short-pass', 'The password field must be at least 12 characters.'],
    'email that already has an account' => ['taken@example.test', 'a-strong-passphrase', 'a-strong-passphrase', 'The email has already been taken.'],
]);

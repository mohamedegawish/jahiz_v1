<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Remove API tokens that expired more than a day ago (ADR-003). Needs the scheduler running.
Schedule::command('sanctum:prune-expired --hours=24')->daily();

// Delete password reset tokens past their 60-minute expiry (config/auth.php), so used-up
// reset links do not accumulate (finding PA-18).
Schedule::command('auth:clear-resets')->everyFifteenMinutes();

// Keep failed jobs a week for investigation (each is also logged as it fails), then
// remove them: their payloads can hold personal data (finding PA-18).
Schedule::command('queue:prune-failed --hours=168')->daily();

// Ask the payment gateway about payments still pending after 15 minutes, in case a
// callback was lost (ADR-017). Does nothing while no gateway is configured (OQ-16).
Schedule::command('payments:reconcile')->everyFifteenMinutes()->withoutOverlapping();

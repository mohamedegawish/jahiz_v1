<?php

namespace App\Providers;

use App\Models\User;
use App\Rules\MaxBytes;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        $this->configureRateLimiting();
        $this->configureAuthentication();
        $this->reportFailedJobs();
    }

    /**
     * A job that failed for good (an invitation or reset email that never left) lands in
     * failed_jobs, which nobody reads unprompted. One error line in the log makes it visible
     * to the container log and any alerting on it (finding PA-18). It names the job only:
     * the payload and the exception message can carry addresses or tokens.
     */
    private function reportFailedJobs(): void
    {
        Queue::failing(function (JobFailed $event): void {
            Log::error('Queued job failed', [
                'job' => $event->job->resolveName(),
                'connection' => $event->connectionName,
                'queue' => $event->job->getQueue(),
                'exception' => $event->exception::class,
            ]);
        });
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request): Limit {
            $user = $request->user();

            // Signed-in accounts: their own, higher limit, since the web client alone makes
            // about 70 calls a minute when moving quickly between pages (finding PA-35).
            return $user !== null
                ? Limit::perMinute(Config::integer('api.user_rate_limit_per_minute'))->by('user:'.$user->getAuthIdentifier())
                : Limit::perMinute(Config::integer('api.rate_limit_per_minute'))->by('ip:'.$request->ip());
        });

        RateLimiter::for('password-reset', fn (Request $request): Limit => Limit::perMinute(5)->by('ip:'.$request->ip()));

        // Public self-registration (ADR-019): provisional abuse limit per IP (OQ-33).
        RateLimiter::for('registration', fn (Request $request): Limit => Limit::perHour(Config::integer('jahez.registration.per_hour_per_ip'))->by('ip:'.$request->ip()));

        // The public IMC-number check answers whether a number is on the IMC list: enough
        // for a visitor typing a number, too few to enumerate the list (finding PA-11).
        RateLimiter::for('registration-check', fn (Request $request): Limit => Limit::perMinute(20)->by('ip:'.$request->ip()));

        // A signed-in password change checks the current password: guessing it is limited
        // per account, whichever address the attempts come from (finding PA-12).
        RateLimiter::for('password-change', fn (Request $request): Limit => Limit::perMinute(5)->by('user:'.$request->user()?->getAuthIdentifier()));

        // Negotiation writes per user (technical defaults, not business rules; ADR-015).
        RateLimiter::for('negotiation-messages', fn (Request $request): Limit => Limit::perMinute(30)->by('user:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('negotiation-offers', fn (Request $request): Limit => Limit::perMinute(10)->by('user:'.$request->user()?->getAuthIdentifier()));
    }

    /**
     * Password policy, reset links and token validity (ADR-003, ADR-011).
     */
    private function configureAuthentication(): void
    {
        Password::defaults(fn (): Password => Password::min(12)->rules([new MaxBytes(72)]));

        ResetPassword::createUrlUsing(fn (User $user, string $token): string => rtrim(Config::string('api.frontend_url'), '/')
            .'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]));

        Sanctum::authenticateAccessTokensUsing(
            fn (PersonalAccessToken $accessToken, bool $isValid): bool => $isValid
                && $accessToken->tokenable instanceof User
                && $accessToken->tokenable->isActive(),
        );
    }
}

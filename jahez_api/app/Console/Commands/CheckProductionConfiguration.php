<?php

namespace App\Console\Commands;

use App\Billing\PaymentGatewayManager;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\StoreProviderEvaluationRequest;
use App\Models\Factory;
use App\Models\ServiceProvider;
use Illuminate\Console\Command;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Go-live gate (Phase 9): checks the loaded configuration for settings that are unsafe
 * in production. Run it on the production host after `php artisan config:cache`.
 * Exits non-zero when any check fails; warnings do not fail the command.
 */
class CheckProductionConfiguration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-production';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check the configuration for settings that are unsafe in production';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $rows = [];
        $failures = 0;

        foreach ($this->checks() as [$name, $status, $detail]) {
            $rows[] = [$status, $name, $detail];
            $failures += $status === 'FAIL' ? 1 : 0;
        }

        $this->table(['Status', 'Check', 'Detail'], $rows);

        if ($failures > 0) {
            $this->components->error("{$failures} check(s) failed. Fix them before going live.");

            return self::FAILURE;
        }

        $this->components->info('All production checks passed.');

        return self::SUCCESS;
    }

    /**
     * @return list<array{string, string, string}>
     */
    private function checks(): array
    {
        $mailer = Config::string('mail.default');
        $queue = Config::string('queue.default');
        $origins = (array) Config::get('cors.allowed_origins', []);

        return [
            $this->check('APP_ENV is production', app()->isProduction(), 'APP_ENV='.app()->environment()),
            $this->check('APP_DEBUG is off', Config::get('app.debug') === false, 'Debug mode exposes exception details and enables Laravel Boost routes'),
            $this->check('APP_KEY is a generated key', $this->appKeyIsGenerated(), 'Generate with php artisan key:generate --show (a base64: key of the cipher\'s length); a placeholder value is not a key'),
            $this->check('APP_URL uses HTTPS', Str::startsWith(Config::string('app.url'), 'https://'), Config::string('app.url')),
            $this->check('FRONTEND_URL uses HTTPS', Str::startsWith(Config::string('api.frontend_url'), 'https://'), 'Reset and invitation links point here'),
            $this->check('Mailer sends real email', ! in_array($mailer, ['log', 'array'], true), "MAIL_MAILER={$mailer}; the log mailer writes reset tokens to the log"),
            $this->check('Queue is asynchronous', $queue !== 'sync', "QUEUE_CONNECTION={$queue}; run php artisan queue:work"),
            $this->check('CORS has no wildcard origin', ! in_array('*', $origins, true), 'CORS_ALLOWED_ORIGINS must list exact origins'),
            $this->check(
                'Web client origin is allowed by CORS',
                $this->frontendOriginIsAllowed($origins),
                'CORS_ALLOWED_ORIGINS must contain the origin of FRONTEND_URL ('.$this->origin(Config::string('api.frontend_url')).') when the web client is served from another origin than APP_URL; otherwise every browser call is refused'
            ),
            $this->check(
                'Hash driver is bcrypt',
                Config::get('hashing.driver') === 'bcrypt',
                'The login timing hash is bcrypt; with another HASH_DRIVER an unknown email fails with a server error, which reveals which accounts exist'
            ),
            $this->check(
                'BCRYPT_ROUNDS matches the login timing hash',
                filter_var(Config::get('hashing.bcrypt.rounds'), FILTER_VALIDATE_INT) === LoginRequest::UNMATCHABLE_PASSWORD_HASH_COST,
                'Must be '.LoginRequest::UNMATCHABLE_PASSWORD_HASH_COST.' so unknown and known emails take equal time'
            ),
            $this->check('Database is MySQL', Config::string('database.default') === 'mysql', 'DB_CONNECTION='.Config::string('database.default')),
            $this->check(
                'Required provider fields are known',
                array_diff((array) Config::get('jahez.providers.required_profile_fields', []), ServiceProvider::REQUIRABLE_FIELDS) === [],
                'JAHEZ_PROVIDER_REQUIRED_FIELDS may list only: '.implode(', ', ServiceProvider::REQUIRABLE_FIELDS).' (OQ-36)'
            ),
            $this->check(
                'Factory onboarding fields are known',
                array_diff((array) Config::get('jahez.factories.required_profile_fields', []), [...Factory::PROFILE_FIELDS, 'sectors']) === [],
                'JAHEZ_FACTORY_REQUIRED_FIELDS may list only: '.implode(', ', [...Factory::PROFILE_FIELDS, 'sectors']).' (OQ-19)'
            ),
            $this->check(
                'Organization documents are on a private disk',
                Config::get('filesystems.disks.'.Config::string('jahez.documents.disk').'.visibility') !== 'public'
                    && Config::get('filesystems.disks.'.Config::string('jahez.documents.disk').'.serve') !== true
                    && is_array(Config::get('filesystems.disks.'.Config::string('jahez.documents.disk'))),
                'JAHEZ_DOCUMENTS_DISK='.Config::string('jahez.documents.disk').' must name a configured disk that is neither public nor served; registration documents hold tax and commercial registry data (ADR-019)'
            ),
            $this->check(
                'Provider evaluation scale is valid',
                Config::get('jahez.providers.evaluation.scale_max') === null || StoreProviderEvaluationRequest::scaleMax() !== null,
                'JAHEZ_PROVIDER_EVALUATION_SCALE_MAX must be a positive whole number, or unset while OQ-13 is open'
            ),
            $this->check(
                'Business time zone is valid',
                in_array(Config::get('jahez.financial_policies.timezone'), timezone_identifiers_list(), true),
                'JAHEZ_BUSINESS_TIMEZONE must be a time zone identifier such as Africa/Cairo; financial policy effective dates are read in it (ADR-023)'
            ),
            $this->check(
                'No financial rule is set in the environment',
                Config::get('jahez.financial_policies.ignored_environment_settings') === [],
                implode(', ', (array) Config::get('jahez.financial_policies.ignored_environment_settings')).' no longer take effect: these rules are approved policies in the database (ADR-023). Remove them'
            ),
            $this->check(
                'Payment gateway is registered',
                Config::get('jahez.billing.payment_gateway') === null || PaymentGatewayManager::isConfigured(),
                'JAHEZ_PAYMENT_GATEWAY must name an adapter registered in config jahez.billing.gateways, or be unset while OQ-16 is open'
            ),
            $this->check(
                'Provider evaluation pass mark is valid',
                Config::get('jahez.providers.evaluation.pass_mark') === null || StoreProviderEvaluationRequest::passMark() !== null,
                'JAHEZ_PROVIDER_EVALUATION_PASS_MARK must be a mark from 0 to 100 with at most two decimals, or unset while OQ-13 is open'
            ),
            [
                'Trusted proxies configured',
                in_array(Config::get('trustedproxy.proxies'), [null, '*', '**'], true) ? 'WARN' : 'PASS',
                'List the load balancer addresses in TRUSTED_PROXIES: unset, every guest shares one rate limit; "*" is safe only if clients cannot reach the app except through the proxy, or they can forge their IP address',
            ],
            [
                'Log level',
                in_array('debug', $this->activeLogLevels(), true) ? 'WARN' : 'PASS',
                'LOG_LEVEL=debug is verbose for production',
            ],
            [
                'PHP upload limits fit the largest upload',
                $this->phpUploadLimitBytes() >= $this->largestUploadBytes() ? 'PASS' : 'WARN',
                'PHP refuses larger requests before the application sees them: upload_max_filesize and post_max_size must be at least '.intdiv($this->largestUploadBytes(), 1024 * 1024).' MB (the largest JAHEZ_*_MAX_KB, or the three registration documents together); the Docker image sets them in docker/php.ini',
            ],
            [
                'Sessions are not stored',
                Config::get('session.driver') === 'array' ? 'PASS' : 'WARN',
                'The API uses no sessions; SESSION_DRIVER=array stops the web routes writing a session for every visitor',
            ],
        ];
    }

    /**
     * @return array{string, string, string}
     */
    private function check(string $name, bool $passes, string $detail): array
    {
        return [$name, $passes ? 'PASS' : 'FAIL', $detail];
    }

    /**
     * A key as key:generate makes it: base64, decoding to the length the cipher needs.
     * Anything else (empty, a placeholder, a short or raw string) fails (finding PA-05).
     */
    private function appKeyIsGenerated(): bool
    {
        $key = (string) Config::get('app.key');
        if (! Str::startsWith($key, 'base64:')) {
            return false;
        }

        $decoded = base64_decode(Str::after($key, 'base64:'), true);

        return $decoded !== false && Encrypter::supported($decoded, Config::string('app.cipher'));
    }

    /**
     * The web client calls the API from FRONTEND_URL's origin: allowed when it is the API's
     * own origin, or listed in CORS_ALLOWED_ORIGINS (finding PA-05).
     *
     * @param  array<mixed>  $allowedOrigins
     */
    private function frontendOriginIsAllowed(array $allowedOrigins): bool
    {
        $frontend = $this->origin(Config::string('api.frontend_url'));
        $allowed = array_map(fn (mixed $origin): string => rtrim((string) $origin, '/'), $allowedOrigins);

        // A wildcard does let the client in; it fails its own check above.
        return $frontend === $this->origin(Config::string('app.url'))
            || in_array('*', $allowed, true)
            || in_array($frontend, $allowed, true);
    }

    /**
     * scheme://host[:port] of a URL, lower-cased, as browsers send it in Origin.
     */
    private function origin(string $url): string
    {
        $parts = parse_url($url);
        if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'])) {
            return $url;
        }

        return Str::lower($parts['scheme'].'://'.$parts['host']).(isset($parts['port']) ? ':'.$parts['port'] : '');
    }

    /**
     * The levels of the channel in use: the default channel, or each channel of a stack.
     *
     * @return list<string>
     */
    private function activeLogLevels(): array
    {
        $default = Config::string('logging.default');
        $channels = Config::get("logging.channels.{$default}.driver") === 'stack'
            ? (array) Config::get("logging.channels.{$default}.channels", [])
            : [$default];

        return array_values(array_map(fn (mixed $channel): string => (string) Config::get('logging.channels.'.$channel.'.level', 'debug'), $channels));
    }

    /**
     * What PHP accepts in one upload (the lower of upload_max_filesize and post_max_size).
     */
    private function phpUploadLimitBytes(): int
    {
        return (int) UploadedFile::getMaxFilesize();
    }

    /**
     * The largest request body the platform accepts: one announcement video, or a
     * registration's logo and two legal documents together (finding PA-03).
     */
    private function largestUploadBytes(): int
    {
        $logo = Config::integer('jahez.documents.logo_max_kb');
        $legal = Config::integer('jahez.documents.legal_max_kb');
        $video = Config::integer('jahez.documents.video_max_kb');

        return max($video, $logo + 2 * $legal) * 1024;
    }
}

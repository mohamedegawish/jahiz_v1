# Deployment Guide

**Status:** first version, Phase 9 (2026-10-03). **It has not been exercised on a real server yet**: there is no staging environment and the hosting is undecided ([OQ-24](open-questions.md#oq-24)). Phase 11 verifies it end to end. Every requirement below comes from code or a recorded decision; the reference is given for each.

## 1. Go-live gate

Run this on the production host after configuring the environment and caching the configuration:

```bash
php artisan config:cache
php artisan app:check-production
```

The command prints a PASS / WARN / FAIL table and exits non-zero on any FAIL. **Do not go live with a FAIL.** Review every WARN.

| Check | FAIL / WARN when | Why |
| --- | --- | --- |
| APP_ENV is production | not `production` | Strict model mode and demo seeding are tied to the environment |
| APP_DEBUG is off | `APP_DEBUG=true` | Debug responses include exception details; Laravel Boost routes are enabled |
| APP_KEY is a generated key | empty, a placeholder, or not a `base64:` key of the cipher's length | Encryption; the `.env.docker.example` placeholder used to pass (finding PA-05) |
| APP_URL / FRONTEND_URL use HTTPS | not `https://` | Reset and invitation links point to `FRONTEND_URL` |
| Mailer sends real email | `log` or `array` | The log mailer writes reset links (valid tokens) to the log ([ADR-011](decisions/ADR-011-account-provisioning-and-credentials.md)) |
| Queue is asynchronous | `sync` | Reset and invitation emails are sent by jobs; with `sync` the forgot-password timing protection is lost |
| CORS has no wildcard origin | `*` in `CORS_ALLOWED_ORIGINS` | Deny-by-default CORS |
| Web client origin is allowed by CORS | `FRONTEND_URL`'s origin differs from `APP_URL`'s and is not in `CORS_ALLOWED_ORIGINS` | Otherwise every browser call is refused (finding PA-05) |
| Hash driver is bcrypt | `HASH_DRIVER` is not `bcrypt` | The login timing hash is bcrypt; another driver makes unknown emails fail with 500 (finding FC-06) |
| BCRYPT_ROUNDS matches the login timing hash | not 12 | Unknown and known emails must cost the same |
| Database is MySQL | another driver | [ADR-004](decisions/ADR-004-database-mysql.md) |
| Required provider fields are known | `JAHEZ_PROVIDER_REQUIRED_FIELDS` lists an unknown field | [OQ-36](open-questions.md#oq-36) |
| Factory onboarding fields are known | `JAHEZ_FACTORY_REQUIRED_FIELDS` lists an unknown field | [OQ-19](open-questions.md#oq-19) |
| Organization documents are on a private disk | `JAHEZ_DOCUMENTS_DISK` is public, served or not configured | Tax and commercial registry documents ([ADR-019](decisions/ADR-019-self-registration-documents-and-legal-changes.md)) |
| Provider evaluation scale / pass mark are valid | not a positive whole number / not 0–100 with at most two decimals (empty counts as unset) | [OQ-13](open-questions.md#oq-13) |
| Business time zone is valid | not a time zone identifier | Policy dates ([ADR-023](decisions/ADR-023-financial-and-contract-policies.md)) |
| No financial rule is set in the environment | any obsolete `JAHEZ_INVOICE_*` / `JAHEZ_TAX_*` / `JAHEZ_REVENUE_*` set | These rules are approved policies now ([ADR-023](decisions/ADR-023-financial-and-contract-policies.md)) |
| Payment gateway is registered | `JAHEZ_PAYMENT_GATEWAY` names no registered adapter | [OQ-16](open-questions.md#oq-16) |
| Trusted proxies configured (WARN) | unset, `*` or `**` | Unset: every guest shares the proxy's rate limit. `*`: safe only if clients cannot reach the app except through the proxy |
| Log level (WARN) | `debug` on the channel in use (each channel of a stack) | Verbose |
| PHP upload limits fit the largest upload (WARN) | `upload_max_filesize` / `post_max_size` below the largest upload (a video, or a registration's three documents) | PHP refuses the request before the application sees it (finding PA-03); the Docker image sets 25 MB / 30 MB in `docker/php.ini` |
| Sessions are not stored (WARN) | `SESSION_DRIVER` is not `array` | The API uses no sessions and has no web routes ([ADR-013](decisions/ADR-013-api-only.md)); `array` keeps it that way if a route that starts sessions is ever added (findings FC-09, FC-17) |

## 2. Environment

Start from `.env.example`. Production values that differ from it:

| Variable | Production value |
| --- | --- |
| `APP_ENV` / `APP_DEBUG` | `production` / `false` |
| `APP_URL`, `FRONTEND_URL` | the real HTTPS URLs |
| `MAIL_MAILER` and `MAIL_*` | a real mail provider |
| `QUEUE_CONNECTION` | `database` (or Redis if [OQ-24](open-questions.md#oq-24) provides it) |
| `SESSION_DRIVER` | `array` |
| `TRUSTED_PROXIES` | the load balancer's addresses or CIDR |
| `CORS_ALLOWED_ORIGINS` | the exact client origins ([OQ-22](open-questions.md#oq-22)) |
| `LOG_LEVEL` | `warning` or `error` |
| `BCRYPT_ROUNDS`, `HASH_DRIVER` | `12`, `bcrypt` (unchanged) |

**Business policies** (`config/jahez.php`). Leave them unset until the owner decides the linked question; `app:check-production` fails on an invalid value:

| Variable | Effect | Decided by |
| --- | --- | --- |
| `JAHEZ_PROVIDER_REQUIRED_FIELDS` | Profile fields required before approval (comma-separated) | [OQ-36](open-questions.md#oq-36) |
| `JAHEZ_DIRECTORY_SHOWS_CONTACT_DETAILS` | `true` shows contact details in the directory | [OQ-37](open-questions.md#oq-37) |
| `JAHEZ_PROVIDER_EVALUATION_SCALE_MAX`, `JAHEZ_PROVIDER_EVALUATION_PASS_MARK` | Enable evaluation scores, the weighted total and the pass-mark result | [OQ-13](open-questions.md#oq-13) |
| ~~`JAHEZ_INVOICE_ISSUER`, `JAHEZ_INVOICE_NUMBER_PREFIX`, `JAHEZ_TAX_RATE_PERCENT`, `JAHEZ_REVENUE_SHARE_PERCENT`~~ | **No longer read** (ADR-023): these rules are approved policies in «الإعدادات المالية والتعاقدية». `app:check-production` fails while any is set | [ADR-023](decisions/ADR-023-financial-and-contract-policies.md) |
| `JAHEZ_BUSINESS_TIMEZONE` | Calendar in which policy effective dates and due dates are read (default `Africa/Cairo`); checked by `app:check-production` | [ADR-023](decisions/ADR-023-financial-and-contract-policies.md) |
| `JAHEZ_PAYMENT_GATEWAY` | Names a gateway adapter registered in `config/jahez.php` `billing.gateways` (none ships). Its callback URL is `/api/v1/payment-gateways/{key}/callback`; the scheduler runs `payments:reconcile` every 15 minutes | [OQ-16](open-questions.md#oq-16) |
| `JAHEZ_FACTORY_REQUIRED_FIELDS` | Factory onboarding checklist (comma-separated; default `sectors`); guidance only, never blocks an assessment. Checked by `app:check-production` | [OQ-19](open-questions.md#oq-19) |
| `JAHEZ_DOCUMENTS_DISK` | Disk for logos and registration documents (default `local`, private). Must be a configured disk that is neither public nor served (checked by `app:check-production`); back it up with the database. PHP `upload_max_filesize`/`post_max_size` ≥ 16M | [ADR-019](decisions/ADR-019-self-registration-documents-and-legal-changes.md) |
| `JAHEZ_LOGO_MAX_KB`, `JAHEZ_LEGAL_DOCUMENT_MAX_KB`, `JAHEZ_REGISTRATIONS_PER_HOUR` | Upload limits (2048, 5120) and public registrations per IP per hour (10): technical defaults | [ADR-019](decisions/ADR-019-self-registration-documents-and-legal-changes.md), [OQ-33](open-questions.md#oq-33) |
| `JAHEZ_FACTORY_APPROVAL_REQUIRED` | `true` (default): only an IMC-approved factory sends service requests; `false`: any factory does, approval stays informational | [OQ-46](open-questions.md#oq-46), [ADR-021](decisions/ADR-021-ministry-administration.md) |
| `MAIL_MAILER` and `MAIL_*` (Gmail) | `MAIL_MAILER=smtp`, `MAIL_SCHEME=smtp`, `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USERNAME` (the sending account), `MAIL_PASSWORD` (a Google App Password; needs 2-step verification on the account), `MAIL_FROM_ADDRESS` (that account or a verified alias). Verify with `php artisan app:mail-check <address>`, then confirm the message in that mailbox. Keep a queue worker running: notification emails are queued (3 tries, then `failed_jobs`) | [ADR-021](decisions/ADR-021-ministry-administration.md) |
| `JAHEZ_MARKETPLACE_SINGLE_AWARD` | `true` (default): the first accepted offer closes the request's other threads; `false`: several providers can be agreed on one request | [OQ-38](open-questions.md#oq-38) |

Optional, not applied: `SANCTUM_TOKEN_PREFIX` would make leaked tokens recognisable by secret scanners (finding FC-16). Decide it before go-live.

### Financial policy permissions (ADR-023)

After the first deployment nobody can prepare or approve financial policies or record manual payments. Grant each to the named administrators the owner designates (OQ-49), from the server console:

```bash
php artisan jahez:permissions grant finance.officer@imc.example financial_policies.manage --reason="Designated by ..."
php artisan jahez:permissions grant finance.director@imc.example financial_policies.approve --reason="Designated by ..."
php artisan jahez:permissions list
```

Give `manage` and `approve` to different people; the API also refuses an approval by whoever prepared a version.

## 3. Release steps

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --force          # reference data only; demo accounts are never created outside local/testing
# Never run DemoDataSeeder in a release: it is not part of db:seed and refuses to run outside local/testing (ADR-024).
php artisan config:cache && php artisan route:cache
php artisan app:check-production
php artisan app:create-admin admin@example.org "Full Name"   # first deployment only; prompts for the password
```

- `--no-dev` also removes Laravel Boost and the MCP middleware, which exist only for development.
- The web client (`front/`) is a separate static build: `npm ci && VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build`, served by nginx with `front/docker/nginx.conf` and `front/docker/security-headers.inc` (its Content-Security-Policy must name the API origin; the Docker build writes it from the same variable). The API itself stays API-only ([ADR-013](decisions/ADR-013-api-only.md)).
- Back up the database and the documents disk before migrating (§6).
- Run `gitleaks git --log-opts="--all" --redact .` on the release commit (no leaks expected), and the test suite on the production MySQL version.
- **Drain the queue before deploying a change to a queued job's constructor** (`php artisan queue:work --stop-when-empty` on the old release). Jobs serialized by the old code are missing the new properties.

## 4. Processes

| Process | Command | Required because |
| --- | --- | --- |
| Queue worker | `php artisan queue:work --tries=3 --timeout=60 --max-time=3600` (kept running by a process supervisor; needs the `pcntl` extension to stop gracefully) | Reset and invitation emails ([ADR-011](decisions/ADR-011-account-provisioning-and-credentials.md)), notification emails |
| Scheduler | `* * * * * php artisan schedule:run` | `sanctum:prune-expired` (daily), `auth:clear-resets` (every 15 minutes), `queue:prune-failed --hours=168` (daily), `payments:reconcile` (every 15 minutes) |

A job that fails for good writes one `error` line, `Queued job failed`, with the job class, connection and queue (never the payload) (finding PA-18). Alert on it. The job itself stays in `failed_jobs` for a week (`php artisan queue:failed`, `queue:retry <id>`).

## 5. Web server

- Serve only the `public/` directory, over HTTPS. The application sends HSTS on requests it sees as HTTPS (which, behind a proxy, needs `TRUSTED_PROXIES`); the proxy may also set it.
- Set `expose_php = Off`, `upload_max_filesize = 25M` and `post_max_size = 30M` in `php.ini` (the Docker image does: `docker/php.ini`).
- The local storage disk is not served by Laravel (`serve => false`), so no `/storage/...` route exists.

## 6. Data

- **Retention** is not defined yet ([OQ-25](open-questions.md#oq-25)). The `audit_logs` table grows without limit until then ([ADR-012](decisions/ADR-012-audit-log.md)).
- **Backups (procedure written in the 2026-10-15 production audit; not yet exercised, no staging host exists).** Two things hold the platform's state: the MySQL database and the documents disk (`api-storage` volume in Docker: logos, registration documents, announcement media). Back up both, at the same time, at least daily and before every deployment that migrates. Keep copies off the host.

  ```bash
  # Database: a consistent dump without locking InnoDB tables.
  docker compose --env-file .env.docker exec -T mysql sh -c 'exec mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | gzip > jahez-db-$(date +%F).sql.gz
  # Documents and media.
  docker run --rm -v <project>_api-storage:/data:ro -v "$PWD":/backup alpine tar czf /backup/jahez-storage-$(date +%F).tar.gz -C /data app
  ```

  **Restore drill** (on a scratch stack, never on production; repeat after any change to this procedure):
  1. Start an empty stack.
  2. `gunzip -c jahez-db-….sql.gz | docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'`.
  3. Extract the storage archive into the new `api-storage` volume.
  4. `php artisan app:check-production`.
  5. Sign in as an administrator and open a factory's registration document.

  The dump contains password hashes, documents and personal data: store and transfer it encrypted.
- The audit log is append-only in the application only. To protect it in the database as well, the application's database user would need to lose UPDATE and DELETE on `audit_logs`. That is not configured, pending the retention decision.

## 7. Docker deployment

The repository root holds a production Compose stack (`docker-compose.yml`, `jahez_api/Dockerfile`, `front/Dockerfile`):
- MySQL 8.4;
- the API on Apache. Its entrypoint caches config, events, routes and views on every start; in the `api` service only (`RUN_MIGRATIONS=true`) it also runs `migrate --force`, `db:seed --force` (reference data, idempotent) and `app:check-production` (logged, not fatal). Two optional steps there: with `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME` and `INITIAL_ADMIN_PASSWORD` set it creates the first IMC administrator (`app:create-admin --password-env=INITIAL_ADMIN_PASSWORD --if-missing`: once, an existing account is left untouched; clear the password variable after the first deploy), and with `SEED_DEMO_DATA=true` it runs `DemoDataSeeder`, which refuses outside `APP_ENV=local`/`testing`;
- a queue worker and a scheduler (`schedule:work`) from the same image, running as `www-data`. They start once the api is healthy, so they never race its migrations;
- the built frontend on nginx, with an SPA fallback and the security headers of `front/docker/security-headers.inc`.

Logs go to the container log (`LOG_CHANNEL=stderr`). PHP settings (upload limits, `expose_php`, opcache) are in `jahez_api/docker/php.ini`. Uploaded documents persist in the `api-storage` volume; the database in `mysql-data`. No host ports are published: HTTP reaches the containers only through the reverse proxy / Coolify domains, and MySQL is reachable only inside the Compose network.

```bash
cp .env.docker.example .env.docker   # fill in APP_KEY, passwords, URLs, mail
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.local.yml up -d --build   # local test (adds :8000/:3000/:3306)
docker compose --env-file .env.docker exec api php artisan app:check-production   # must PASS before going live
docker compose --env-file .env.docker exec api php artisan app:create-admin admin@example.org "Full Name"
```

Deploying on Coolify: add the repository as a Docker Compose resource with the base directory at the repository root (do not include `docker-compose.local.yml`), paste the `.env.docker` values into the resource's Environment Variables (every `${VAR}` in `docker-compose.yml` is detected there automatically; `${VAR:?…}` entries block deployment while empty), and add one domain on the `api` service (internal port 80, e.g. `https://api.example.com`) and one on the `frontend` service (internal port 80, e.g. `https://app.example.com`). Set `FRONT_API_URL` as a build-time variable as well: it is baked into the frontend image, so changing it requires a redeploy with rebuild. Post-deploy, open the `api` container's terminal in Coolify and run `php artisan app:check-production` (must PASS) and, on the first deploy only, `php artisan app:create-admin admin@example.org "Full Name"` (or set `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_NAME` / `INITIAL_ADMIN_PASSWORD` before deploying and clear the password afterwards).

Notes:

- `APP_KEY`: generate with `php artisan key:generate --show` from `jahez_api/` and paste it into `.env.docker` (or the Coolify variables). Never reuse a development key.
- `VITE_API_BASE_URL` is baked into the frontend at build time (`FRONT_API_URL`); changing it needs `docker compose up -d --build frontend` (or a Coolify redeploy).
- Terminate TLS in front of the stack (reverse proxy / Coolify proxy) and set `TRUSTED_PROXIES` so the app sees HTTPS; the go-live gate (§1) refuses plain-http `APP_URL` / `FRONTEND_URL`. `CORS_ALLOWED_ORIGINS` must be the exact frontend origin.
- Queue jobs are `database`-backed, so no Redis is required; the `queue` service is the process supervisor's equivalent here.
- No host cron is needed: the `scheduler` service runs `php artisan schedule:work` (every task in §4).
- `FRONT_API_URL` is required: the frontend build stops without it (there is no localhost fallback). For local Docker set it to `http://localhost:8000/api/v1`.
- The business settings of §2 are passed through Compose with the application's defaults; set them in `.env.docker` / Coolify only once the owner decides them.
- The `IMC number` unique-index migration (2026-10-15) stops, without changing anything, if existing factories or providers already share an IMC number, and names them. IMC decides which record keeps the number; correct the others, then redeploy ([OQ-59](open-questions.md#oq-59)).
- This stack has not been exercised on a real server yet (same status as §1–§6 above). The 2026-10-15 audit checked the Compose files' structure and the shell steps without Docker; the first real run must confirm the build, the `www-data` ownership of the `api-storage` volume, and the healthchecks.

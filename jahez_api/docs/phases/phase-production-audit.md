# Phase log: production security and readiness audit (2026-10-14 → 2026-10-15)

**Request (owner, 2026-10-14):** a full security, QA and production-readiness audit of the whole repository (API, web client, Docker / Coolify deployment). Fix what is safe to fix, with regression tests, and end with a production-readiness verdict.

**Branch:** `security/production-audit` (from `main` @ `e3d373d`), one commit, not pushed.

**Owner decisions taken in this session (asked before building, 2026-10-14):**
- **Test database:** the owner starts MySQL. Tests use only `jahez_testing`.
- **Self-registration:** keep instant sign-in (ADR-028 D1) and harden it. Raise the password minimum to the platform's 12, stop marking unproven emails verified, and record the residual risk ([OQ-58](../open-questions.md#oq-58)).
- **Delivery:** one commit on a new branch.

## 1. Scope and method

Already-reviewed surfaces were not re-audited: login, reset, the audit log and the marketplace (findings FC-01..17 and CR-11..35). They are covered by the full regression run. This audit covered everything built after the Phase 9 pass:
- self-registration with a chosen password;
- uploads and public media, the IMC-number whitelist and its import, landing settings and announcements;
- the cart, transformation plans and financial policies (authorization only);
- notifications;
- the React web client and its nginx;
- the Docker / Coolify stack and the go-live gate.

**Discovery:**
- Three read-only sweeps: backend auth, uploads and newer endpoints; the web client; deployment and quality.
- The route file, migrations and models were read directly.
- Every reported issue was confirmed by reading the code before it was accepted.
- What was checked and found correct is listed in §5.

**Fixes:** each with a test written first and seen to fail where the test could run (see the Evidence column of [findings.md](../security/findings.md#production-audit-2026-10-15-branch-securityproduction-audit)). Tests that need MySQL were written before the fix, and they were run once the database was available (§4).

## 2. Feature checklist

Status key:
- **Tested**: covered by the automated suite (existing or added here).
- **Fixed**: changed in this audit, with a regression test.
- **Blocked**: needs an owner decision or an external service.
- **Not verified**: could not be exercised here.

| Area | Feature | Status | Notes |
| --- | --- | --- | --- |
| Auth | Login, throttling, lockout, logout | Tested | FC-01, FC-02, CR-19, CR-20 |
| Auth | Forgot / reset password (queued, expiring, single-use links) | Tested | **Email delivery not verified** (needs real SMTP: `app:mail-check`) |
| Auth | Change password while signed in | Fixed (new) | PA-12 |
| Auth | Sign out of every device | Fixed (new) | PA-27 |
| Auth | Email verification | Interim | No verification step by owner decision; unverified state now recorded and shown (PA-08, [OQ-58](../open-questions.md#oq-58)) |
| Registration | Factory and provider self-registration with documents | Fixed | Password policy, trimming, timing, IMC uniqueness (PA-06, 07, 09, 10) |
| Registration | IMC-number whitelist check and admin management and import | Fixed | Throttle, zip-bomb cap, 422 on bad files, audit atomicity (PA-11, 28, 32, 33) |
| Accounts | Admin user management, deactivation, last-admin protection | Tested | `email_verified` added to the user resource |
| Organizations | Factory and provider profiles, documents (private, authorized), legal change requests, approvals | Tested | Download authorization re-checked: scoped, cross-tenant 404 |
| Catalog | Catalog, categories, provider directory, category suggestions | Tested / Fixed | PA-30 (list authorizes before validating) |
| Readiness | Questionnaire, assessments, scoring, versions, analytics, levels, progression | Tested | Authorization re-checked on every route |
| Plans | Transformation plans: drafts, publish, items, execution | Tested | Authorization re-checked (manual parent checks present) |
| Marketplace | Requests, threads, negotiation, offers, cart and checkout | Tested | Lock order unchanged |
| Contracts and billing | Agreements, contract drafts, invoices, manual payments, financial policies | Tested / **Blocked** | Money operations answer 409 `policy_not_configured` until the owner sets the policies (OQ-15, 16, 17); no payment gateway adapter exists (OQ-16) |
| Landing | Landing settings, logo, announcements (top, hero, bottom, footer), hero video | Fixed | Ad rotation stored by the API (PA-15), placement filter (PA-22), video byte ranges and caching (PA-21, PA-26), link pattern (PA-29) |
| Notifications | In-app and email copies | Fixed | Markdown injection (PA-25); failed jobs logged (PA-18); **delivery not verified** |
| Audit | Append-only audit log, every new event tested | Tested | Two new events (`auth.password_changed`, `auth.logged_out_everywhere`) |
| Web client | Route guards, token handling, error states, API contract | Checked / Fixed | No mock data; every client call exists in `routes/api.php`; error boundaries (PA-16); CSP (PA-13) |
| Deployment | Docker / Coolify stack | Fixed, **not run** | No Docker on the audit host (§6) |
| Operations | CI | Added, **not executed** | Runs on the first push (PA-24) |
| Operations | Backups and restore | Documented, **not exercised** | `deployment.md` §6 |
| Operations | Error monitoring | **Blocked** | Needs a service choice (Sentry or similar) and its DSN |

## 3. Changes

**API (`jahez_api/`):**
- Registration:
  - `RegisterFactoryRequest` and `RegisterServiceProviderRequest` use `Password::defaults()` and IMC `Rule::unique`.
  - `RegistrationController` hashes before the existing-email branch and answers with neutral text.
  - `OrganizationRegistrar` leaves the email unverified.
  - Migration `2026_10_15_100001`: unique IMC indexes; it stops without changing data when duplicates exist.
- Accounts:
  - `PUT /me/password` (`AccountPasswordController`, `UpdatePasswordRequest`) and `POST /auth/logout-all`.
  - Limiters `password-change` (5/min per account) and `registration-check` (20/min per IP).
  - `UserResource.email_verified`.
- Public media: `StoredFileResponse` (byte ranges, 404 for a missing file); `SecurityHeaders` allows `public, max-age=300` on the three public media routes only; CORS `max_age` 600.
- Landing and announcements: `landing_settings.ad_rotation_seconds` (migration `2026_10_15_100002`); `filter[placement]` on the admin announcement list; link pattern `\A…\z`.
- Notifications: `PlatformEventMail::asPlainText()` escapes Markdown link syntax.
- IMC import: `ImcRegisteredNumberImporter` caps each part at 20 MB and answers 422 for unreadable workbooks; `ImcRegisteredNumberController::import` runs in one transaction with its audit entry.
- Category suggestions: `ListCategorySuggestionsRequest` authorizes first, allow-lists its filters and extends `ListRequest`.
- Go-live gate (`app:check-production`): a generated `APP_KEY`; the web client origin in CORS; PHP upload limits (WARN); the log level of the active channel.
- Configuration: in `config/jahez.php`, empty optional settings count as unset.
- Jobs: `AppServiceProvider` logs failed jobs; `routes/console.php` schedules `auth:clear-resets` and `queue:prune-failed --hours=168`.
- Docker:
  - `Dockerfile`: `pcntl`, `docker/php.ini`, `ServerTokens Prod`, `composer:2.8`, `dump-autoload --no-dev`.
  - `docker/api-entrypoint.sh`: migrates and seeds only with `RUN_MIGRATIONS=true`, and gives storage back to www-data.
  - `.dockerignore` excludes tests, docs, Postman and agent files.

**Web client (`front/`):**
- Passwords: `lib/password.ts` (the API's rule, untrimmed secrets) used by both registration forms, the reset page and the new password card in account settings.
- Registration and reset: neutral post-registration text; reset token removed from the address bar.
- Error boundaries: route-keyed around all routes and both layouts, plus one in `main.tsx`.
- Ad rotation: read from the API through a shared cached landing request; the admin control saves it; no more browser storage.
- Admin pages: the hero-video page filters by placement; the users page shows "البريد غير مؤكَّد"; labels for the new audit events.
- The invoice print window is triggered from the opener (no inline script).
- Build and serving: `docker/csp.txt`, `docker/security-headers.inc`, `docker/nginx.conf` (headers, gzip, `index.html` no-cache, `server_tokens off`), `Dockerfile` (Node 22, `nginx:1.27-alpine`, required API URL, CSP origin written at build time), `vite.config.ts` (`vite preview` sends the same CSP).
- Housekeeping: `package.json` renamed `jahez-front` with `engines`; FAQ text corrected; size placeholder corrected; README rewritten.

**Repository root:**
- `docker-compose.yml`:
  - `RUN_MIGRATIONS` on api only;
  - queue and scheduler run as `www-data` and wait for a healthy api;
  - `FRONT_API_URL` required;
  - `LOG_CHANNEL=stderr`;
  - worker `--timeout` / `--max-time`;
  - the business settings passed with the application's defaults.
- `.env.docker.example` updated to match.
- `.github/workflows/ci.yml` added.
- `run.bat`: stop and status fixed.
- `README.md` deployment notes updated.

**Documentation:**
- `security/findings.md` (PA-01..34) and `security/threat-model.md` (T3, T5, T7, T18 updated; T36–T38 added);
- `deployment.md` (gate table complete, processes, backups, Docker notes);
- `api-endpoints.md`, `roles-permissions.md`, Postman folder 24 and its README;
- ADR-011 and ADR-028 addenda;
- open questions [OQ-58](../open-questions.md#oq-58) and [OQ-59](../open-questions.md#oq-59).

## 4. Commands and results

All on the audit host (Windows 11, PHP 8.2.12 CLI, Node 26.7.0, no Docker), 2026-10-14/15.

| Command | Result |
| --- | --- |
| Baseline `php artisan test --compact` before any change (MariaDB 10.4.32 on :3306) | Interrupted when the session ended: **1124 tests passed, 0 failed** before it stopped; no summary line. MySQL then went down. |
| `front`: `npm run lint`, `npm test`, `npm run build` before any change | lint clean; **30/30** tests; build OK |
| `front`: `npx tsc -b`, `npx oxlint`, `npm test`, `npm run build` after the changes | 0 type errors; lint clean; **39/39** tests (new: `password.test.ts`, `rotation.test.ts`; `noLocalEligibility` tightened); build OK |
| New tests that need no database, run first against the unfixed code | `Config/JahezConfigTest` 3 failed (empty values read as `''`/`0`); `NotificationMailTest` › Markdown link: failed (`href="https://evil.example…"` in the HTML); `Unit/AnnouncementLinkPatternTest` 1 failed (trailing newline); `CheckProductionConfigurationTest` 8 failed (placeholder key, CORS origin, upload WARN, log channel); `Jobs/QueueFailureLoggingTest` failed (no log line) |
| The same tests after the fixes | all pass: `Config/` 5 (`SanctumConfigTest`'s CSRF case needs the database), mail 1, link pattern 8, go-live gate **32/32**, failure logging 1, CORS 4 + unit 64 together |
| `composer analyse` (Larastan level 8) | **No errors** (468 files) |
| `vendor/bin/pint --dirty --format agent` | 2 import orders fixed, otherwise clean |
| `composer audit` | No security vulnerability advisories found |
| `npm audit` / `npm audit --omit=dev` | found 0 vulnerabilities |
| `gitleaks git --log-opts="--all" --redact .` (8.30.1) | 6 commits, **no leaks found** |
| `gitleaks dir` over the working tree | 6 hits, all inside the untracked, ignored `jahez_api/vendor/` (Symfony MIME table, PHPStan phar): false positives; none in project files |
| Compose structure check (`symfony/yaml`, 20 assertions: services, identical env lists, `RUN_MIGRATIONS` on api only, `www-data`, health dependencies, no empty `JAHEZ_*` except the four optional ones, no obsolete financial variables, required `FRONT_API_URL`, worker timeout, stderr logs) | **20/20 PASS** |
| `sh -n docker/api-entrypoint.sh` | OK; the file is LF (`.gitattributes`) |
| CSP substitution step of `front/Dockerfile`, simulated in Git Bash | Correct header, no placeholder left (an earlier draft also rewrote the file's own comment: fixed) |
| CSP in a real browser: `vite preview` (production policy) + headless Chrome over the DevTools protocol, 8 pages (`/`, `/login`, `/register/factory`, `/register/provider`, `/forgot-password`, `/reset-password?…`, `/use-cases`, an unknown path) | Every page rendered; **no CSP violation**. Control: an injected inline script and a foreign image were blocked and reported (3 violations), so the detector works |
| `run.ps1 -Status` | Works (the batch wrapper now maps `status` / `stop` to it) |
| Full API suite with every new test (`php artisan test --compact`) | **PENDING: MySQL down at the time of writing** (see §8) |

## 5. Checked and found correct (no change)

- Role, organization and approval fields are never mass-assignable or taken from a request; registration assigns them on the server.
- Documents and media:
  - on a private disk under UUID names; client file names are metadata only;
  - SVG is refused; content type is checked from the bytes;
  - document downloads are authorized and route-scoped (cross-tenant 404).
- Queries: no `$request->all()`; every `*Raw` query is a constant or bound; no outbound HTTP (`Http::`) and no SSRF surface.
- Logging: nothing logs passwords or tokens.
- Routes: every record route authorizes; cart, plan, readiness-admin and financial-policy routes are gated by policies; the payment callback answers 404 while no gateway is configured.
- Web client:
  - the token goes to `sessionStorage` (`localStorage` only with "remember me"), never in a URL;
  - roles and permissions come from `GET /me`;
  - the post-login redirect is restricted to the user's own portal;
  - no `dangerouslySetInnerHTML`, `eval` or iframes;
  - the invoice print escapes every API value;
  - no mock data.

## 6. Production configuration checklist (names only)

**Required (deployment blocks or the gate fails without them):**
- `APP_KEY` (generated with `key:generate --show`), `APP_URL`, `FRONTEND_URL` (both HTTPS), `APP_ENV=production`, `APP_DEBUG=false`;
- `DB_PASSWORD`, `DB_ROOT_PASSWORD` (Docker), `DB_DATABASE`, `DB_USERNAME`;
- `MAIL_MAILER` (not `log`/`array`), `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`;
- `CORS_ALLOWED_ORIGINS` (the web client's origin, unless same-origin);
- `FRONT_API_URL` (frontend build).

**Recommended:** `TRUSTED_PROXIES` (the proxy's range; `*` only while no port is published), `LOG_LEVEL=warning`.

**Business policies (leave at their defaults until the owner decides):** the `JAHEZ_*` list in `deployment.md` §2.

**Not yet decided:** `SANCTUM_TOKEN_PREFIX` (FC-16).

**Services the platform depends on:** MySQL 8.4, a queue worker, the scheduler, an SMTP provider, TLS termination at the proxy.

## 7. Remaining manual actions and external dependencies

1. **Start MySQL and run the full suite** (pending item of §4), then MySQL 8.4 parity (`DB_PORT=3307`) before release.
2. **First real Docker / Coolify deployment** on a staging host. Check:
   - the image builds;
   - the healthchecks pass;
   - `api-storage` files are owned by `www-data`;
   - `app:check-production` passes;
   - the IMC unique-index migration either applies or names duplicates for IMC to resolve.
3. **SMTP:** configure the provider and run `php artisan app:mail-check <address>`; confirm in the mailbox (reset, invitation and notification emails).
4. **Backups:** schedule the procedure of `deployment.md` §6 and run the restore drill once on staging.
5. **Error monitoring and alerting:** choose a service; alert on `Queued job failed` log lines and on the health endpoint.
6. **Push the branch** so CI runs; review its first results.
7. **Owner decisions:**
   - [OQ-58](../open-questions.md#oq-58) (email verification);
   - [OQ-59](../open-questions.md#oq-59) (IMC number uniqueness scope);
   - OQ-15, 16, 17 (money rules, gateway, contracts);
   - OQ-25 (retention);
   - OQ-33 (password and lockout policy confirmation);
   - FC-16 (token prefix).
8. **PHP 8.2 security support ends 2026-12-31:** plan PHP 8.3 (image and local), with a full suite run on it.
9. **Portal pages under the CSP:** the CSP was verified on the public and authentication pages. Signed-in portal pages need a running API, as do the private-file previews (`blob:`) and the invoice print. Check them once on staging (`npx vite preview` against a staging API) before release.

## 8. Verdict

Written after the full suite run; see the end of this log.

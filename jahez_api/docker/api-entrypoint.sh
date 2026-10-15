#!/bin/sh
# Container start: bake the runtime configuration and, in the one service that owns the
# schema (RUN_MIGRATIONS=true: the api service only), run every start-up step: migrate,
# seed the reference data, optionally the demo data and the first administrator, and
# report the go-live gate. Then hand over to the CMD (apache2-foreground, or
# `php artisan queue:work` / `schedule:work` in the queue and scheduler services).
set -e

# One by one, not `php artisan optimize`: optimize exits 0 even when a step fails.
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    # Only this service migrates, so the services never race each other. --force: there is
    # no TTY. (--isolated would need the cache table, which does not exist before the
    # first migration.)
    php artisan migrate --force
    # The reference data (sectors, catalog, readiness questionnaire): idempotent, and it
    # creates no account outside the local/testing environments (DatabaseSeeder).
    php artisan db:seed --force

    # Synthetic demo data (ADR-024), opt-in. The seeder itself refuses outside the local
    # and testing environments (its accounts share a public password), so under
    # APP_ENV=production this only logs a warning. A failure does not stop the API.
    if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
        php artisan db:seed --class=DemoDataSeeder --force \
            || echo "api-entrypoint: the demo data was not seeded (see above)." >&2
    fi

    # The first IMC administrator (ADR-011), once: only while INITIAL_ADMIN_EMAIL is set,
    # and an existing account is left untouched (--if-missing). The password is read from
    # INITIAL_ADMIN_PASSWORD by name, never passed as an argument. A refusal (weak password,
    # missing variable) is logged and does not stop the API.
    if [ -n "${INITIAL_ADMIN_EMAIL:-}" ]; then
        php artisan app:create-admin "$INITIAL_ADMIN_EMAIL" "${INITIAL_ADMIN_NAME:-IMC Administrator}" \
            --password-env=INITIAL_ADMIN_PASSWORD --if-missing --no-interaction \
            || echo "api-entrypoint: the initial administrator was not created (see above)." >&2
    fi

    # The go-live gate (docs/deployment.md §1), reported in the container log on every
    # start. Not fatal: a local Docker test on plain http fails it by design.
    php artisan app:check-production \
        || echo "api-entrypoint: the go-live gate reports failures (see above); fix them before going live." >&2
fi

# The api container starts as root (Apache drops to www-data). Whatever the commands above
# wrote to the shared storage volume (logs, compiled views), and any root-owned file left
# by an older image, is handed back to www-data: the queue and scheduler run as www-data
# (docker-compose.yml `user:`), and Apache could not append to a root-owned log file
# (a failed log write turns any logged error into a 500).
if [ "$(id -u)" = "0" ]; then
    chown -R www-data:www-data storage bootstrap/cache
fi

exec "$@"

#!/bin/sh
# Container start: bake the runtime configuration and, in the one service that owns the
# schema (RUN_MIGRATIONS=true: the api service only), migrate and seed the reference data.
# Then hand over to the CMD (apache2-foreground, or `php artisan queue:work` /
# `schedule:work` in the queue and scheduler services).
set -e

php artisan config:cache
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

#!/bin/sh
# Container start: bake the runtime configuration, bring the schema up to date,
# then hand over to the CMD (apache2-foreground, or `php artisan queue:work`
# in the queue service). Migrations run with --force because there is no TTY.
set -e

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

exec "$@"

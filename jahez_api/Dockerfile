# Jahez API (Laravel 12, PHP 8.2 + Apache).
#
# Build context is ./jahez_api. The image serves the API on port 80. On start it caches
# the configuration and, in the service that sets RUN_MIGRATIONS=true (the api service
# only), migrates and seeds the reference data (see docker/api-entrypoint.sh). The queue
# worker and the scheduler reuse this image with a different command (docker-compose.yml).

FROM php:8.2-apache

# System packages + PHP extensions the app needs (pdo_mysql, mbstring, xml, zip, bcmath,
# intl, fileinfo, opcache, and pcntl so the queue worker stops gracefully on SIGTERM and
# enforces job timeouts). No image library: uploads are only validated by detected
# content type, never processed.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        git \
        unzip \
        libonig-dev \
        libzip-dev \
        libicu-dev \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        exif \
        bcmath \
        intl \
        opcache \
        pcntl \
        zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# Production PHP settings (upload limits, expose_php off, opcache).
COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-jahez.ini"

# Serve Laravel's public/ directory; do not announce the Apache and OS versions.
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && printf 'ServerTokens Prod\nServerSignature Off\n' > /etc/apache2/conf-available/zz-jahez.conf \
    && a2enconf zz-jahez

WORKDIR /var/www/html

# Dependencies first (better layer caching), then the application code.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist

COPY . ./
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p storage/app/private storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["api-entrypoint.sh"]
CMD ["apache2-foreground"]

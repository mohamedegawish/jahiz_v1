# Jahez API (Laravel 12, PHP 8.2 + Apache).
#
# Build context is ./jahez_api. The image serves the API on port 80 and runs
# migrations + config caching on every start (see docker/api-entrypoint.sh).
# The queue worker reuses this image with a different command (docker-compose.yml).

FROM php:8.2-apache

# System packages + PHP extensions the app needs (pdo_mysql, mbstring, xml,
# zip, bcmath, intl, fileinfo, opcache). No image library: uploads are only
# validated by detected content type, never processed.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        git \
        unzip \
        libzip-dev \
        libicu-dev \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        exif \
        bcmath \
        intl \
        opcache \
        zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Serve Laravel's public/ directory.
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

WORKDIR /var/www/html

# Dependencies first (better layer caching), then the application code.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist

COPY . ./
RUN composer dump-autoload --optimize \
    && mkdir -p storage/app/private storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["api-entrypoint.sh"]
CMD ["apache2-foreground"]

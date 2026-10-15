# Jahez frontend (Vite + React).
#
# Build context is ./front. VITE_API_BASE_URL is baked in at build time, so it
# arrives as a build-arg (see docker-compose.yml). The result is static files
# served by nginx with an SPA fallback and the security headers of
# docker/security-headers.inc; the Content-Security-Policy (docker/csp.txt)
# allows the API origin taken from the same build-arg.

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Fail the build instead of shipping a bundle that cannot reach the API.
RUN test -n "$VITE_API_BASE_URL" || (echo "VITE_API_BASE_URL (FRONT_API_URL) is required" >&2 && exit 1)
RUN npm run build

FROM nginx:1.27-alpine

ARG VITE_API_BASE_URL
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.inc /etc/nginx/security-headers.inc
COPY docker/csp.txt /tmp/csp.txt
# The CSP names the API origin (scheme://host[:port]) the bundle talks to.
RUN api_origin="$(printf '%s' "$VITE_API_BASE_URL" | sed -E 's#^(https?://[^/]+).*#\1#')" \
    && csp="$(sed "s#__API_ORIGIN__#${api_origin}#g" /tmp/csp.txt)" \
    && sed -i "/^add_header Content-Security-Policy /s#__CSP__#${csp}#" /etc/nginx/security-headers.inc \
    && rm /tmp/csp.txt \
    && ! grep -q '__CSP__\|__API_ORIGIN__' /etc/nginx/security-headers.inc

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

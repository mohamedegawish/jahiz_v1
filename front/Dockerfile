# Jahez frontend (Vite + React).
#
# Build context is ./front. VITE_API_BASE_URL is baked in at build time, so it
# arrives as a build-arg (see docker-compose.yml). The result is static files
# served by nginx with an SPA fallback and the security headers of
# docker/security-headers.inc. nginx also forwards /api/ to the API container
# (API_UPSTREAM, default http://api:80), so VITE_API_BASE_URL=/api/v1 makes the
# browser call the API on the frontend's own origin. An absolute URL
# (https://api.example.com/api/v1) still works, and the Content-Security-Policy
# (docker/csp.txt) then allows that origin as well.

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Fail the build instead of shipping a bundle that cannot reach the API: an absolute
# http(s) URL, or a path on this origin such as /api/v1.
RUN printf '%s' "$VITE_API_BASE_URL" | grep -Eq '^(https?://[^/]+|/[^/])' \
    || (echo "VITE_API_BASE_URL (FRONT_API_URL) must be /api/v1 or an absolute http(s) URL" >&2 && exit 1)
RUN npm run build

FROM nginx:1.27-alpine

ARG VITE_API_BASE_URL
# Where /api/ is forwarded, on the Docker network. Read when the container starts (the
# image's template step); override it in the service environment.
ENV API_UPSTREAM=http://api:80
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/security-headers.inc /etc/nginx/security-headers.inc
COPY docker/csp.txt /tmp/csp.txt
# The CSP names the API origin (scheme://host[:port]) when the bundle talks to another
# origin; for a same-origin path ('self') the placeholder is dropped.
RUN api_origin="$(printf '%s' "$VITE_API_BASE_URL" | sed -nE 's#^(https?://[^/]+).*#\1#p')" \
    && csp="$(sed "s# __API_ORIGIN__#${api_origin:+ ${api_origin}}#g" /tmp/csp.txt)" \
    && sed -i "/^add_header Content-Security-Policy /s#__CSP__#${csp}#" /etc/nginx/security-headers.inc \
    && rm /tmp/csp.txt \
    && ! grep -q '__CSP__\|__API_ORIGIN__' /etc/nginx/security-headers.inc

# Render the default upstream now and check the whole configuration at build time; the
# container start renders it again from the runtime API_UPSTREAM.
RUN envsubst '${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf \
    && nginx -t

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

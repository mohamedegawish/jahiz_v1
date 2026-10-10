# Jahez frontend (Vite + React).
#
# Build context is ./front. VITE_API_BASE_URL is baked in at build time, so it
# arrives as a build-arg (see docker-compose.yml). The result is static files
# served by nginx with an SPA fallback.

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

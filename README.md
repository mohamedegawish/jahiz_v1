# jahiz_v1

Jahez — Industrial Modernisation Centre (IMC) "Smart Industry – Ecosystem" platform. It connects IMC staff, industrial factories and digital-transformation service providers: factory self-registration (gated by the IMC-registered numbers whitelist), IMC review and approval, digital-readiness assessment, service catalog and marketplace with negotiation, agreements and contracts, billing, transformation plans, and landing-page announcements.

| Part | Stack | Local address |
| --- | --- | --- |
| `jahez_api/` | Laravel 12 API (PHP 8.2, MySQL, Sanctum bearer tokens) | http://localhost:8000 |
| `front/` | React 19 + Vite + Tailwind | http://localhost:3000 |

## Run locally (Windows)

```bat
run.bat            :: DB check, setup (deps, migrate, every seeder incl. demo data), API :8000, queue worker, frontend :3000
run.bat status     :: DB / API / frontend status + API health
run.bat stop       :: stop everything this launcher started
```

Details per part: `jahez_api/README.md`, `front/README.md`. Production audit (2026-10-15): `jahez_api/docs/phases/phase-production-audit.md`. API conventions: `jahez_api/docs/api-conventions.md`. Deployment gate: `jahez_api/docs/deployment.md`.

## Deploy with Docker

Production Compose stack at the repository root (MySQL 8.4 + API on Apache + queue worker + scheduler + built frontend on nginx). No host ports are published: traffic enters through the reverse proxy / Coolify domains.

```bash
cp .env.docker.example .env.docker   # fill in APP_KEY, passwords, URLs, mail
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.local.yml up -d --build   # local test (publishes :8000/:3000)
docker compose --env-file .env.docker exec api php artisan app:check-production   # must PASS before going live
docker compose --env-file .env.docker exec api php artisan app:create-admin admin@example.org "Full Name"  # first deploy only
```

- Generate `APP_KEY` with `php artisan key:generate --show` from `jahez_api/` (never reuse a dev key).
- Update: back up the database and the `api-storage` volume (`jahez_api/docs/deployment.md` §6), then `git pull && docker compose --env-file .env.docker up -d --build`. The `api` service migrates, seeds the reference data and logs the go-live gate on every start (optionally also creates the first admin via `INITIAL_ADMIN_*` and seeds demo data via `SEED_DEMO_DATA`, see `.env.docker.example`); the queue worker and the scheduler wait until it is healthy.
- `FRONT_API_URL` defaults to `/api/v1`: the browser calls the API on the frontend's own domain and the frontend's nginx forwards `/api/` to the `api` service (`API_UPSTREAM`, default `http://api:80`). An absolute public API URL still works for a cross-origin setup.
- Coolify: deploy the repo as a Docker Compose resource (base = repo root, without `docker-compose.local.yml`), paste `.env.docker` values into Environment Variables, add a domain on the `frontend` service (internal port 80); a domain on the `api` service is optional. Redeploy to update.
- Terminate TLS in front of the stack and set `TRUSTED_PROXIES`; the go-live gate refuses plain-http URLs.
- Full notes: `jahez_api/docs/deployment.md` (§7) and `.env.docker.example`.

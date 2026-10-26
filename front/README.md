# Jahez web client

React 19 + Vite + Tailwind single-page app for the Jahez API (`../jahez_api`). Every business rule, permission and score is decided by the API; the client keeps only the bearer token in browser storage (`src/auth/tokenStore.ts`, enforced by `tests/noLocalEligibility.test.ts`).

## Requirements

- Node.js 22.12 or later (`package.json` `engines`).
- `VITE_API_BASE_URL`: the API base URL, e.g. `http://localhost:8000/api/v1` locally (copy `.env.example` to `.env`). There is no fallback: the app refuses to start without it.

## Commands

```bash
npm ci
npm run dev        # http://localhost:3000 (the API's CORS allow-list expects this origin)
npm run lint       # oxlint
npm test           # node:test over tests/*.test.ts
npm run build      # type check + production bundle in dist/
npx vite preview   # serves dist/ on :3000 with the production Content-Security-Policy
```

## Production

- The Docker image (`Dockerfile`) builds with `VITE_API_BASE_URL` (the `FRONT_API_URL` compose variable, default `/api/v1`) and serves `dist/` with nginx (`docker/nginx.conf`): SPA fallback, `index.html` never cached, fingerprinted assets cached for a year, and `/api/` forwarded to the API container (`API_UPSTREAM`, default `http://api:80`, read at container start) so the browser calls the API on its own origin.
- Security headers come from `docker/security-headers.inc`. The Content-Security-Policy lives in `docker/csp.txt`; its API-origin placeholder becomes the origin of an absolute `VITE_API_BASE_URL` at build time, and is dropped for a same-origin path (`'self'` covers it). `vite preview` sends the same policy, so check a build against it before release: no inline scripts, and no other origins except Google Fonts.
- The password rules shown to users (`src/lib/password.ts`) mirror the API's `Password::defaults()`: at least 12 characters, at most 72 bytes. Passwords are sent exactly as typed.

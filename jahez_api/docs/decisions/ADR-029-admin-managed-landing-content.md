# ADR-029: Admin-Managed Landing Content

**Date:** 2026-10-12
**Status:** Accepted (owner feature request)

## Context

The landing page (logo, hero texts, section texts, FAQ, closing banner, footer)
was hardcoded in the web client. IMC administrators could only manage the
announcements around it (ADR-022: ad strips, hero video). The owner asked
for a settings page in the admin portal controlling everything on the landing
page, from the logo to every text.

## Decisions

- **D1 — One `landing_settings` row, null means bundled.** A single-row table
  holds the logo reference, ~20 text columns and 7 JSON columns (tab headlines,
  trust facts, chips, quick facts, service cards, how steps, FAQ items). The row
  is created by the first real update; reads and rejected requests never write.
  Every column stays null until set, and the web client falls back to its
  bundled Arabic copy for anything unset — the landing never depends on the API.
  Nothing is seeded; this is IMC-managed content, not reference data.
- **D2 — Same permission as announcements, no new matrix.** `PUT /landing` and
  the logo actions reuse `announcements.manage` (the landing-content permission
  family); anything else gets 404, guests 401. Public `GET /public/landing` and
  `GET /public/landing/logo` need no token. Changes are audited as
  `landing.updated` with field names only; a no-op writes nothing.
- **D3 — Raster logo only.** The logo uploads (jpg, png, webp, logo size limit)
  reuse the documents disk and the announcement-cover file pattern. SVG is
  refused: an inline-served SVG could carry scripts to visitors. The bundled SVG
  mark stays the fallback (header, footer, closing banner). Partner marks
  (ministry, IMC) and the auth/sidebar chrome stay fixed: they are third-party
  marks or functional UI, not marketing copy.
- **D4 — Fixed structure, editable words.** Icons, destinations, tab labels,
  section order and card counts stay in code; only the words (and the logo)
  are editable. The 7 service-category cards stay hardcoded: their titles name
  the fixed catalog categories, and editing them could lie about the catalog.
  FAQ items are free (add/remove, at most 12); other lists are fixed-shape
  (trust 3, chips 3, quick facts 3, service cards 4, steps 4) with per-position
  icons.
- **D5 — Web client.** One admin page (`/admin/landing`, seven tabs, partial
  PUT per tab); an empty field restores the bundled copy. Public components
  read `GET /public/landing` once per surface (layout + landing) and fall back
  silently on failure.

# ADR-028: Direct-Password Registration, Category Suggestions, Training Pages, Cart Approval Gate

**Date:** 2026-10-10
**Status:** Accepted (owner feature request, 8 items)

## Context

Owner-requested round (2026-10-10), preserving all existing business logic:

1. Provider registration depended on invitation emails that often never arrived
   (local `MAIL_MAILER=log`, queue worker not always running, SMTP unconfigured).
2. Providers had no way to propose a missing service category.
3. The factory approval gate (`approval_required`, OQ-46) was enforced on request
   sending but not on cart collection, and the services page did not surface it.
4. No dedicated per-provider training page with clear prices.
5. Email validation was RFC-only; frontend used a loose regex.
6. No success-stories video page; home had no video section.
7. Factory UI said «سلة» (cart) instead of «خطة» (plan).
8. Brand word «جاهز» without diacritics.

## Decisions

- **D1 — Direct password at registration.** `POST /registration/factories` and
  `POST /registration/service-providers` accept optional `password` +
  `password_confirmation` (min 8, max 72). The controller bcrypt-hashes it and
  passes only the hash to `RegisterOrganization`; the job sets it on the member
  (the `hashed` cast keeps pre-hashed values) and skips the invitation email.
  Members sign in immediately. Legacy no-password registrations keep the old
  email-link flow untouched. Emails validated with `email:rfc,dns`.
- **D2 — Category suggestions.** New `category_suggestions` table + full API
  (`GET/POST /category-suggestions`, `POST …/approve`, `POST …/reject`).
  Providers propose; IMC reviews with the existing `service_listings.review`
  permission (no new permission matrix). Approval marks the suggestion as a
  **workbook candidate only — it never writes a catalog row** (ADR-014 stays
  intact). Rejection requires a reason. Duplicate names (catalog or own pending)
  are refused with 422. Audit events `category_suggestion.created/reviewed`.
- **D3 — Cart approval gate.** `POST /cart/items` and `PATCH /cart/items/{id}`
  now refuse with the same 409 as request sending while the factory is pending
  (`ensureFactoryMayCollect`, share-locked row). The services page shows
  `FactoryApprovalNotice` and disables request/cart buttons with the same reason.
- **D4 — Training pages.** No new tables: `GET /factory/providers/:id/training`
  reads `GET /provider-directory/{id}` + `GET /service-listings?filter[provider]`;
  enablement-category and training-named services sort first; every package shows
  its monthly/annual price (or «السعر في العرض»).
- **D5 — Success stories.** No new tables: public `/use-cases` page lists live
  announcements carrying `video_path` (all placements) with native `<video>`
  players; `HomeVideos` strip on the landing shows the footer-placement video.
  Both read the existing public endpoints.
- **D6 — Wording.** Factory cart UI renamed سلة → خطة (labels only; API and
  route `/factory/cart` unchanged). Brand «جاهز» → «جَاهِز» for the standalone
  brand word only (الجاهزية/جاهزية untouched).

## Consequences

- Registration no longer depends on email delivery when a password is chosen;
  enumeration protection (same 202) is unchanged.
- Catalog purity (ADR-014) preserved: suggestions never auto-create categories.
- Pending factories get a clear 409 at collection time instead of a cart that
  can never be sent.
- New tests: `CategorySuggestionTest` (suggest/review/duplicate/cart-gate),
  `CategorySuggestionPolicyTest`, `RegistrationTest` direct-password block.

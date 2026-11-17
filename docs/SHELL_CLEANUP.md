# Legacy shell removal and hardening — 2026-11-17

Follow-up to the chronological timeline release. Goal: remove the retired legacy application that still loaded under the timeline, fix the review's UX defects, and harden the score server. Charcoal/lime, the 8px grid, team artwork, timeline structure and all data wiring are unchanged.

## Frontend
- `app.js` (231KB legacy app: community, chat, admin, odds, prediction, invite, share card) replaced by a ~6KB shell: view routing, sport selection and textContent toasts. `KoreanNames` moved verbatim to `korean-names.js`.
- `index.html` 56KB → 14KB: no hidden legacy sections, no inline `onclick`/`style`, no Firebase SDK (3 render-blocking scripts while configuration was `null`), no Font Awesome CDN. Skip link added.
- `styles.css` 114KB → 10KB, pruned by CSS rule coverage over 14 UI states at 7 widths; screenshots of every state at 320/390/768/1024/1440 were pixel-identical before and after pruning. Dead legacy selectors were removed from `score-center.css`.
- Final results no longer show "갱신 지연" or the stale-data warning; past-date pages report "종료된 경기 결과". Final matches in details poll every 60s instead of 10s.
- Mobile: one heading row (title, calendar trigger, 오늘), duplicate prev/next/date field and summary removed; rows 169px → 121px; first viewport at 390×844 shows 4 matches instead of 2. Desktop rows 97px → 73px.
- Detail view: readable back control with device-back support (one history entry per opened match), aligned provider link, flow chart colours from tokens.
- First-party payload 486KB → 133KB (gzip 108KB → 35KB). The deliberately adopted Astryx bundle (838KB, async, non-blocking) is unchanged.

## Backend
- Every request runs inside a guard: one thrown error returns 500 instead of exiting the Node process.
- `TRUST_PROXY_HOPS` makes the per-visitor rate limit use the trusted `X-Forwarded-For` hop behind a proxy/CDN. Default 0 keeps the previous behaviour; the production proxy topology was not verified from this environment.
- Security headers (nosniff, Referrer-Policy, X-Frame-Options, COOP, Permissions-Policy, HSTS) and a CSP on HTML; the same policy ships as `_headers` and a meta CSP for static hosts. Versioned JS/CSS are served `immutable`.
- `/api/health` reports the release referenced by `index.html` instead of a hard-coded October string.
- Naver kickoff times keep an explicit offset when present instead of re-labelling it as KST.

## Verification
- 65 automated tests pass (new: security headers/caching/release, proxy-hop identity, Naver offset). `npm run check` and `npm run skills:check` pass.
- Browser audit, 7 widths × 14 states: no page errors, no CSP violations, no horizontal overflow, every visible control named, touch targets ≥44px on mobile and ≥24px on desktop.
- External logo/API hosts were unreachable from the test sandbox, so logos rendered as the neutral placeholder and scores came from saved snapshots.
- Data audit unchanged and still open: 22 stale-source warnings and 29 standings rows without team IDs. These are data gaps, not UI defects; no IDs or scores were invented.

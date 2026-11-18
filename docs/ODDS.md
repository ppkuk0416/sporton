# Major leagues and odds comparison — 2026-11-18

## Major leagues
`sports-core.js` marks EPL, La Liga, Bundesliga, Serie A, Ligue 1 and the Champions League with `major: true`.
- League chips under the sport tabs: 전체, 주요 리그 and individual leagues for the selected sport. `?league=major` is a shareable filter; the Astryx league selector offers the same group.
- In an unfiltered list, major-league fixtures form a "주요 리그" section above "그 외 경기"; both stay chronological (the approved timeline).
- Rows carry a 주요 badge with a trophy icon. League emblems are not used: the score feeds do not carry verified league artwork, and SPORTON does not hotlink or invent logos.

## Odds data
`GET /api/odds?date=YYYY-MM-DD` (server/odds.cjs) returns the shape documented at the top of `odds-core.js`.
- Provider: The Odds API v4 `/sports/{key}/odds`, markets `h2h,totals`, decimal prices, bookmakers from `ODDS_BOOKMAKERS` (default Pinnacle, William Hill, Betfair). Bookmaker coverage is the provider's; availability of a given brand (for example Bet365) must be checked against the provider's bookmaker list before adding it.
- Matching: a provider event attaches to an ESPN fixture only when both team names agree (accent/abbreviation tolerant, small alias table) and kick-off is within 3 hours. Unmatched fixtures get no prices and display "-". Nothing is guessed.
- Movement: the server remembers the last distinct price per bookmaker/market/outcome and reports it as `previous` for 2 hours, which drives ▲/▼.
- Without `ODDS_API_KEY` the route returns 503 `unconfigured`, the browser stops asking for 30 minutes, and no odds UI renders. Provider failures keep the last board as `stale` (labelled 갱신 지연).
- Quota: one refresh costs (markets × bookmaker groups) per league that has fixtures that day. With 2 markets, ≤10 bookmakers and the default 600-second cache, a busy matchday with 6 leagues can use roughly 6 × 2 × 6/hour ≈ 72 credits per hour while visitors are active. Raise `ODDS_CACHE_SECONDS` on small plans.

## Display
- Row: a collapsed "배당" summary with the best price per outcome; expanding shows a per-bookmaker 1X2 table. Detail view: always-open 1X2 table with team-named columns plus the closest-to-2.5 totals line.
- Outcome order follows the row (away left, draw, home right). The highest price per outcome is highlighted (ties all highlighted); ▲/▼ show movement against the previous price, with screen-reader text.
- Only fixtures that have not finished in priced leagues show odds. Tables scroll inside their own container on narrow screens.
- Wording is informational: no bookmaker links, no betting calls to action. Operators are responsible for whether showing overseas bookmaker odds is permitted in their market (in Korea, betting with unlicensed overseas operators is illegal and promoting it can be regulated).

## Demo / mock data
- `?odds=demo` renders deterministic sample prices (`odds-core.js` `demoBooks`) for every open priced fixture, labelled 예시 in rows and details. It is for layout work and screenshots only and never activates on its own.
- `tests/fixtures/odds/the-odds-api-epl.json` is a provider-shaped mock response used by the tests (real 2026-11-21 EPL fixtures, invented prices).

## Verification
- 75 automated tests pass, including normalisation, team matching, best price ties, movement windows, demo realism, adapter off/on/failure paths and HTTP route validation.
- Browser audit at 320–1920px in normal and demo modes: no errors, CSP violations, overflow or unnamed controls; mobile targets ≥44px.
- The live provider was not called from this environment (no key). Real coverage and team-name matching rates must be checked after setting `ODDS_API_KEY`.

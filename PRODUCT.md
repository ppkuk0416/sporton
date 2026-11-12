# SPORTON

SPORTON lets Korean-speaking users find domestic and overseas sports schedules, scores and results in Korean time, follow teams, pin matches and inspect supported match details.

The application uses static HTML/CSS and vanilla JavaScript for scores, with progressively enhanced React/Astryx control islands for search, league/region filters and refresh. The optional Node.js server serves the site and read-only score/detail APIs. Node.js 22+ is required; the prepared cloud uses Node 24. React 19, Astryx 0.7.14 and StyleX are pinned in package-lock.json; esbuild produces committed static browser assets with `npm run build`. There is no TypeScript project. The Node score server still runs independently of UI build dependencies.

Product facts and constraints:

- Scores and records come from the existing Naver/ESPN integrations and published snapshots. Fetch time, provider event time and live freshness are different facts.
- Teams use provider-, league- and team-scoped IDs. Season totals are not inferred from a short schedule cache. See `docs/DATA_OPERATIONS.md` and the data audit report.
- A logo URL does not prove that its asset loaded or was independently verified. Unknown team artwork has a neutral unavailable state.
- Delayed and saved data keep their original timestamps and an explicit warning. Do not present these states as live.
- Firebase community/chat configuration is still pending; the score workflow runs independently. Do not invent credentials or enable unrestricted database writes.
- The user approved a structural redesign into a chronological match timeline, retaining charcoal/lime identity, team logos and the 8px grid. AI analysis was explicitly removed; archived offline engine files are not an active product feature.

This captures the user's existing brief and current code, not claims of a new deployment, connected Firebase project, current upstream data or a completed security audit.

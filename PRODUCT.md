# SPORTON

SPORTON lets Korean-speaking users find domestic and overseas sports schedules, scores and results in Korean time, follow teams, pin matches and inspect supported match details. The AI page exposes the available KBL/NBA schedules and analysis status; absent predictions or training data stay unavailable.

The application uses static HTML/CSS and vanilla JavaScript. The optional Node.js server serves the site and read-only score/detail/AI APIs. Node.js 22+ is required; the prepared cloud uses Node 24. There is no bundler, TypeScript project or application package dependency to install.

Product facts and constraints:

- Scores and records come from the existing Naver/ESPN integrations and published snapshots. Fetch time, provider event time and live freshness are different facts.
- Teams use provider-, league- and team-scoped IDs. Season totals are not inferred from a short schedule cache. See `docs/DATA_OPERATIONS.md` and the data audit report.
- A logo URL does not prove that its asset loaded or was independently verified. Unknown team artwork has a neutral unavailable state.
- Delayed and saved data keep their original timestamps and an explicit warning. Do not present these states as live.
- Firebase community/chat configuration is still pending; the score workflow runs independently. Do not invent credentials or enable unrestricted database writes.
- The user selected a charcoal dashboard with diffuse lighting, translucent surfaces, lime accents, rounded controls and an 8px grid. Quality refinements preserve that choice.

This captures the user's existing brief and current code, not claims of a new deployment, connected Firebase project, current upstream data or a completed security audit.

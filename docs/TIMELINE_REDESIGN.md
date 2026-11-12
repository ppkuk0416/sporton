# Chronological timeline release — 2026-11-12

User-approved structural redesign: chronological match timeline, preserving charcoal/lime identity, 8px spacing and provider team artwork. This supersedes the earlier card-layout polish reports for the home screen.

- Replaced the left rail, metric tiles and two-column league cards with a seven-day date strip and single chronological list. Kickoff minutes are grouped by parsed instants; the left time axis remains visible while scanning a group. Mobile stacks teams; wide screens align opposing teams around scores.
- Removed AI navigation, page, browser assets and scheduled pipeline. Retired page paths return home. AI snapshots are excluded from both static deployment paths and the local server; historical offline engine/data remain archived.
- Preserved score sources, team IDs, logo resolution, delayed-data labeling, favorite/pin state, detail navigation and URL context.

Validation: 62 automated tests passed; data schema audit and vendored skill integrity checks passed. Seven-width browser QA (320, 360, 390, 768, 1024, 1440, 1920) checked date navigation, search/reset, favorites, pin/remove, keyboard filter disclosure, long names, details/back, standings and bounds without page errors. Build, TypeScript, linter and coverage stages are not configured in this static application.

Impeccable code-led finish reviewer disposition: **ship** for the supplied desktop/mobile timeline captures and direction contract. One static detector pass reported 57 findings (54 in legacy index markup, 3 in score CSS); visual review did not map them to a visible timeline violation. This is not an all-site accessibility or security certification.

Existing data limitations remain separate: 22 stale-source warnings and 29 standings rows missing team IDs at audit time. Preserve unknown artwork and original timestamps rather than inventing source facts. Production domestic API returned 502 before deployment; UI publication does not establish feed recovery or Firebase connection. The independently hosted Sites API requires its own deployment for server route retirement.

Local browser evidence: /workspace/artifacts/timeline/first-390.png and first-1440.png. Publication verification is saved separately under /workspace/artifacts/timeline/publication.json after release.

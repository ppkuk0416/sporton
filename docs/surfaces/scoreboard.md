# Chronological scoreboard

Mode: **Operate**. Build path: **code-led**, using the working product and real saved provider records; no approved image comp.

User decisions: remove AI analysis; redesign the structure; prioritize balance and consistency; choose “시간순 경기 타임라인”. Preserve charcoal/lime, team artwork and 8px rhythm.

THESIS: Find a match by date and kickoff time, then read its score and freshness in a single chronological list.

OWN-WORLD: SPORTON charcoal #191D1C ground, lime #D3F897 selection, existing Korean system sans, tabular times and scores. Real provider team artwork is the visual material. No stock imagery, invented statistics or decorative charts.

STORY: Select a date, scope by sport/status/search or expanded league filters, scan actual kickoff groups, favorite or pin a match and open its details without losing context.

FIRST VIEWPORT: Existing brand/navigation; actual selected-date heading and compact counts; sport tabs; seven real dates; search/filter/refresh; accurate per-match source state; first kickoff group and scores. Mobile prioritizes date selection, then compact stacked teams; desktop aligns teams on opposite sides of the score.

FORM: seed:d6543589f6464afd. The dealt structural candidates were wide list with pinned side board, chronological timeline, and left league navigation. The user chose the timeline. Signature move: a continuous left time axis and one sticky time label per real kickoff minute. Familiar buttons, tabs, native date input and filter disclosure remain standard controls.

Targets: index.html, score-center.css, score-center.js, sports-core.js, watchboard.css and football-standings.css.

Invariants: existing sources/IDs/logos, real score values, delayed/stored labels, favorite/pin persistence, details/back, URL context, keyboard focus, reduced motion, 48px controls and mobile safe area. Unknown kickoff time sorts last. Sort by parsed instant, not a text clock or live-first ranking.

Astryx enhancement: actual TextInput, searchable sport-grouped Selector, Button and IconButton control islands preserve the timeline and existing score state. Compact touch selection uses a bottom sheet. The user removed the aggregate league-delay banner; keep it absent.

States: loading, saved snapshot, upstream unavailable, missing logo, long names, empty search, favorite/my-team empty state and detail failure. Test 320–1920px, narrow zoom equivalent, date navigation and internal table/filter scrolling. A visual review is not proof of Firebase connectivity, live feed freshness or a completed security audit.

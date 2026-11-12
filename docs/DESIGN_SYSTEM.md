# SPORTON UI — charcoal glass

The score center uses the tokens in `tokens.css`, imported by `score-center.css`. The user approved a chronological timeline redesign: solid charcoal surfaces, lime date selection, a left time axis and aligned match rows.

- Use an 8px spacing grid: 8, 16, 24, 32, 40, 48 and 64px. Prefer the `--ui-space-*` variables for padding, margins and gaps.
- Keep mobile controls 48px tall. Compact secondary controls may be 40px on desktop. Icon artwork can be smaller than its touch target.
- Use 16px corners for content surfaces and 8px for controls. Reserve translucent 1px borders for quiet separation.
- Use the system Korean font stack. Page titles are 32px on the score dashboard and 28px on mobile; match names are 16px and 14px. Use tabular numerals for scores and times.
- Lime indicates selection and interaction, with dark text on filled controls. Live status has an explicit text label; amber indicates delayed or unavailable data. Always keep the text label alongside the color.
- Keep a clear reading order: page title and actual match-count summary, sport, date and filters, data freshness, start time, match rows. Do not present stored or delayed scores as live.
- Preserve visible keyboard focus, reduced-motion support, horizontal scrolling within filters/tables and the mobile safe area.

Typography, border thickness and optical icon details do not need to be multiples of 8. Bump the versioned HTML assets and service-worker shell together when shipping visual changes.

Use one chronological list at all widths. Group records by actual kickoff minute, ascending, with unknown times last. Each row retains its actual league label. Keep all scores, counts and freshness labels based on the existing data pipeline; do not add decorative charts with invented values. The underline header navigation and date strip reuse the existing working match/date/team actions. Use short color and position transitions; honor reduced-motion preferences.

On mobile, place popular-league shortcuts inside the expandable filter panel to keep match cards within reach. Keep aggregate source status available to assistive technology. The user requested removal of the prominent league-delay banner; do not reintroduce it or replace it with another source-warning banner. Per-match source labels remain accurate.

Keep search visible beside the filter and refresh actions. Input edges use `--score-field-line` for contrast; general panel rules keep the quieter `--score-line`. Selected sport/league actions, applied-filter tokens and status labels have distinct emphasis. Disabled controls keep their native disabled attribute, a disabled surface/ink pair and a not-allowed cursor. Home titles use a 32px desktop / 28px mobile scale, container alignment and system font. Group provider, collection time and delay facts as individual items rather than repeated punctuation.

Use `SportonTeamLogos` (`team-logos.js`) for match artwork in score cards, details, pinned games . Use provider URLs or the exact provider/league/team key registered in `data/teams/catalog.json`; never construct an unobserved logo URL. Retain the team name when an image is unavailable. Keep 32px logo slots in cards and 64px slots in details, with original artwork colors and proportions.

# SPORTON UI — charcoal glass

The score center and AI dashboard share the tokens in `tokens.css`, imported by `score-center.css`. The visual direction follows the supplied dashboard video: charcoal surfaces, diffuse blue/olive/coral light, translucent panels, capsule navigation and lime accents.

- Use an 8px spacing grid: 8, 16, 24, 32, 40, 48 and 64px. Prefer the `--ui-space-*` variables for padding, margins and gaps.
- Keep mobile controls 48px tall. Compact secondary controls may be 40px on desktop. Icon artwork can be smaller than its touch target.
- Use 24px corners for content surfaces, 16px for nested panels and capsule corners for navigation and filters. Reserve translucent 1px borders for quiet separation.
- Use the system Korean font stack. Page titles are 36px on the score dashboard and 28px on mobile; match names are 16px and 14px. Use tabular numerals for scores and times.
- Lime indicates selection and interaction, with dark text on filled controls. Live status has an explicit text label; amber indicates delayed or unavailable data. Always keep the text label alongside the color.
- Keep a clear reading order: page title and actual match-count summary, sport, date and filters, data freshness, league, match cards. Do not present stored or delayed scores as live.
- Preserve visible keyboard focus, reduced-motion support, horizontal scrolling within filters/tables and the mobile safe area.

Typography, border thickness and optical icon details do not need to be multiples of 8. Bump the versioned HTML assets and service-worker shell together when shipping visual changes.

Use two match-card columns on desktop and one on mobile. Keep all scores, counts and freshness labels based on the existing data pipeline; do not add decorative charts with invented values. The desktop rail and capsule navigation reuse the existing working match/date/team actions. Use short color and position transitions; honor reduced-motion preferences.

On mobile, place popular-league shortcuts inside the expandable filter panel to keep match cards within reach. Keep source status available to assistive technology when the visible delayed-data notice already communicates the same state.

Keep search visible beside the filter and refresh actions. Input edges use `--score-field-line` for contrast; general panel rules keep the quieter `--score-line`. Selected sport/league actions, applied-filter tokens and status labels have distinct emphasis. Disabled controls keep their native disabled attribute, a disabled surface/ink pair and a not-allowed cursor. Home and AI titles use the same 36px desktop / 28px mobile scale, container alignment and system font. Group provider, collection time and delay facts as individual items rather than repeated punctuation.

Use `SportonTeamLogos` (`team-logos.js`) for match artwork in score cards, details, pinned games and AI schedules. Use provider URLs or the exact provider/league/team key registered in `data/teams/catalog.json`; never construct an unobserved logo URL. Retain the team name when an image is unavailable. Keep 32px logo slots in cards and 64px slots in details, with original artwork colors and proportions.

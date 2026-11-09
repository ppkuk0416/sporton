# Scoreboard and AI schedules

Mode: **Operate**.

Targets: `index.html`, `score-center.css`, `football-standings.css`, `ai.html`, `ai-dashboard.css`.

Success means finding a date/league/team, reading a score and its freshness, pinning/following a match and opening details without losing context. On the AI surface, users distinguish schedules, available predictions and unavailable analysis.

Preserve the established charcoal/glass/lime design and 8px grid. Prioritize legibility, consistent data states, keyboard access and compact mobile controls. Check actual Korean team names, long foreign names, saved snapshots, upstream failures and missing artwork at narrow, intermediate and wide widths.

The source/audit state is described in `PRODUCT.md` and `docs/DATA_OPERATIONS.md`. A clean visual detector is not proof that live data, Firebase rules or the deployed API are ready.

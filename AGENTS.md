# SPORTON project guidance

Use the existing checkout. Cloud tasks are isolated; create no worktree unless the user requests one. Preserve existing changes.

Read `PRODUCT.md` for product facts and `DESIGN.md` plus `docs/DESIGN_SYSTEM.md` for the approved visual direction. UI work preserves the user's charcoal/glass/lime reference and 8px spacing system unless they request a redesign. Read `docs/DATA_OPERATIONS.md` before changing team identities, logos, records, seasons or collectors.

## Select skills by task

- UI review/refinement: `.agents/skills/impeccable/SKILL.md`. The scoreboard is an Operate surface; see `docs/surfaces/scoreboard.md`. A detector warning is evidence to inspect, not authorization to replace the approved design.
- When the user names Hallmark, apply the cloud Hallmark skill in app scope using the locked `DESIGN.md`. The reviewed GitHub tool provenance and preflight are in `.hallmark/`; the latest application report is `docs/HALLMARK_POLISH.md`. Keep Hallmark's checks scoped to the actual score surfaces and preserve data wiring.
- New or reshaped UI (any visual change): read `.agents/skills/frontend-design/SKILL.md` (Anthropic) together with Impeccable. Its rule "the brief's own words always win" applies: SPORTON's approved charcoal ground with a lime accent matches the skill's listed default trait #2 by the user's choice, so that list is never a reason to redesign. Use its planning, restraint, copywriting and CSS-specificity guidance inside the locked `DESIGN.md`.
- Browser testing: `.agents/skills/webapp-testing/SKILL.md` (Anthropic). Follow its reconnaissance-then-action pattern (wait for load, inspect, then act) and capture console errors. Python Playwright is not installed here and Playwright must not be reinstalled; use the preinstalled Node `require('playwright')` with the same steps, and `npm start` (port 4173) as the server.
- Verification: `.agents/skills/verification-loop/SKILL.md`. Use this repository's actual commands; report missing build, TypeScript, linter or coverage stages as not configured rather than installing unrelated tools or claiming they passed.
- Security-specific work: `.agents/skills/security-audit/SKILL.md`. Its guidance mode is scoped; installation is not a completed audit. Full audits require an explicit full-audit request, its independent-verification workflow and its execution isolation. Never weaken that isolation to run a security reproduction.

## Verification and provenance

Run `npm run check`, `npm run data:audit` and `npm run skills:check` for applicable changes. After editing any versioned JS/CSS run `npm run release:stamp` (assets are cached immutable; `npm run check` fails otherwise). For routing or navigation changes run `npm run e2e` (Node Playwright browser checks). Use `npm run data:sync` only when source data actually changed. Report missing team IDs, stale data and unverified image access separately from schema validation; never invent scores, season totals, rankings or logos to clear warnings.

Installed skill sources and licenses are pinned by `.agents/skills-lock.json`. Keep vendored files unchanged; use their documented fallbacks when capabilities are unavailable. Review an upstream update and refresh its file hashes deliberately. Do not install global Git/agent hooks, MCP servers, automatic memory observers or runtime packages merely because a third-party README recommends them. Do not print credential values during scans.

For the cloud's writable Impeccable engine cache, use `IMPECCABLE_HOME=/workspace/.cache/impeccable` with `.agents/skills/impeccable/scripts/impeccable`. The launcher verifies the engine against the vendored checksum manifest. Keep runtime caches outside the checkout.

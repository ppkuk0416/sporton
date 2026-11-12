# SPORTON project guidance

Use the existing checkout. Cloud tasks are isolated; create no worktree unless the user requests one. Preserve existing changes.

Read `PRODUCT.md` for product facts and `DESIGN.md` plus `docs/DESIGN_SYSTEM.md` for the approved visual direction. UI work preserves the user's charcoal/glass/lime reference and 8px spacing system unless they request a redesign. Read `docs/DATA_OPERATIONS.md` before changing team identities, logos, records, seasons or collectors.

## Select skills by task

- UI review/refinement: `.agents/skills/impeccable/SKILL.md`. The scoreboard is an Operate surface; see `docs/surfaces/scoreboard.md`. A detector warning is evidence to inspect, not authorization to replace the approved design.
- When the user names Hallmark, apply the cloud Hallmark skill in app scope using the locked `DESIGN.md`. The reviewed GitHub tool provenance and preflight are in `.hallmark/`; the latest application report is `docs/HALLMARK_POLISH.md`. Keep Hallmark's checks scoped to the actual score/AI surfaces and preserve data wiring.
- Verification: `.agents/skills/verification-loop/SKILL.md`. Use this repository's actual commands; report missing build, TypeScript, linter or coverage stages as not configured rather than installing unrelated tools or claiming they passed.
- Security-specific work: `.agents/skills/security-audit/SKILL.md`. Its guidance mode is scoped; installation is not a completed audit. Full audits require an explicit full-audit request, its independent-verification workflow and its execution isolation. Never weaken that isolation to run a security reproduction.

## Verification and provenance

Run `npm run check`, `npm run data:audit` and `npm run skills:check` for applicable changes. Use `npm run data:sync` only when source data actually changed. Report missing team IDs, stale data and unverified image access separately from schema validation; never invent scores, season totals, rankings or logos to clear warnings.

Installed skill sources and licenses are pinned by `.agents/skills-lock.json`. Keep vendored files unchanged; use their documented fallbacks when capabilities are unavailable. Review an upstream update and refresh its file hashes deliberately. Do not install global Git/agent hooks, MCP servers, automatic memory observers or runtime packages merely because a third-party README recommends them. Do not print credential values during scans.

For the cloud's writable Impeccable engine cache, use `IMPECCABLE_HOME=/workspace/.cache/impeccable` with `.agents/skills/impeccable/scripts/impeccable`. The launcher verifies the engine against the vendored checksum manifest. Keep runtime caches outside the checkout.

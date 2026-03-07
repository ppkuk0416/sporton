# PM Skills Marketplace

**65+ agentic PM skills and workflows** — from discovery to strategy, execution, launch, and growth.

Built for Claude Code. Compatible with Gemini, Cursor, Codex, and Kiro.

---

## What's Inside

| Plugin | Skills | Commands | Focus |
|--------|--------|----------|-------|
| [pm-product-discovery](./pm-product-discovery/) | 5 | 3 | Ideation, assumptions, user research |
| [pm-product-strategy](./pm-product-strategy/) | 5 | 3 | Vision, business models, competitive analysis |
| [pm-execution](./pm-execution/) | 6 | 4 | PRDs, OKRs, sprints, roadmaps |
| [pm-market-research](./pm-market-research/) | 4 | 2 | Personas, segmentation, competitor analysis |
| [pm-data-analytics](./pm-data-analytics/) | 3 | 2 | SQL, A/B tests, cohort analysis |
| [pm-go-to-market](./pm-go-to-market/) | 4 | 2 | GTM strategy, growth loops, battlecards |
| [pm-marketing-growth](./pm-marketing-growth/) | 3 | 2 | Positioning, north star metric, naming |
| [pm-toolkit](./pm-toolkit/) | 3 | 3 | Resume, proofread, legal docs |

---

## Installation

### Claude Code (CLI)

```bash
# Add the marketplace
claude mcp add pm-skills

# Install individual plugins
claude plugin install pm-product-discovery
claude plugin install pm-execution
```

### Claude Cowork

1. Browse **Plugins > Personal**
2. Add Marketplace from GitHub
3. Enter: `sporton/pm-skills`

### Other AI Tools (Gemini, Cursor, Codex, Kiro)

Copy the `SKILL.md` files into your tool's knowledge directory.

---

## How Skills Work

Skills are domain-specific knowledge blocks that Claude activates automatically based on context.

```
User: "Help me brainstorm ideas for improving retention"
Claude: [Activates brainstorm-ideas-existing skill] → Structured ideation output
```

Commands chain multiple skills into end-to-end workflows:

```
/pm-execution:write-prd  →  Activates: create-prd, user-stories, prioritization-frameworks
```

---

## Plugins Overview

### Discovery → Strategy → Execution → Launch

```
pm-product-discovery  ──►  pm-product-strategy  ──►  pm-execution
         │                                                   │
         ▼                                                   ▼
pm-market-research           pm-marketing-growth     pm-go-to-market
         │                                                   │
         ▼                                                   ▼
pm-data-analytics ──────────────────────────────── pm-toolkit
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

Run validation before submitting a PR:

```bash
python3 validate_plugins.py
```

---

## License

MIT License. Copyright 2026.

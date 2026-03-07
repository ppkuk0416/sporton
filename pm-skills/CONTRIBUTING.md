# Contributing to PM Skills Marketplace

Thank you for contributing! All contributors receive public acknowledgment.

---

## Quick Rules

| Rule | Detail |
|------|--------|
| **One change per PR** | Single skill, command, or fix |
| **Naming convention** | Skills = nouns, Commands = verbs |
| **Validate before submitting** | `python3 validate_plugins.py` |
| **No cross-plugin direct links** | Use natural language suggestions instead |

---

## Adding a Skill

1. Create a directory: `pm-<plugin>/skills/<skill-name>/`
2. Add `SKILL.md` with this frontmatter:

```markdown
---
name: skill-name
description: One-line description of what this skill does
---

# Skill Name

Use when: [trigger conditions]

## Framework

[Step-by-step methodology]

## Output Format

[Expected output structure]
```

**Requirements:**
- `name` must match directory name exactly
- 50–3000 words
- Must include trigger phrases ("use when" or "trigger")

---

## Adding a Command

1. Create a file: `pm-<plugin>/commands/<command-name>.md`
2. Required format:

```markdown
---
description: One-line description of the workflow
argument-hint: "[optional] <required-arg>"
---

# Command Name

[Multi-step workflow using skills from this plugin]

## Step 1: ...
## Step 2: ...
```

**Requirements:**
- `description` field is mandatory
- `argument-hint` is strongly recommended
- Commands may only reference skills from the same plugin
- Command names must be verbs (e.g., `write-prd`, `analyze-test`)

---

## Process

**Minor changes** (fix typos, improve wording): Open a PR directly.

**Major additions** (new skill, new plugin): Open an issue first for discussion.

---

## Validation

```bash
python3 validate_plugins.py
```

Exit codes:
- `0` — All checks passed
- `1` — Failures detected (see output for details)

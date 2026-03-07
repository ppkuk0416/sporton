---
name: identify-assumptions
description: Map and prioritize risky assumptions for a product idea using the five assumption categories and an impact-confidence matrix.
---

# Identify Assumptions

Use when: the user wants to validate a product idea, prepare for an experiment sprint, map the riskiest bets before building, or pressure-test a solution before committing to it.

Trigger: "identify assumptions", "map risks", "validate idea", "what are we assuming", "assumption mapping"

## Framework

Every product bet rests on a set of unvalidated assumptions. The goal is to surface the riskiest ones before investing in building.

### Five Assumption Categories

#### 1. Value Assumptions
"Will customers want this?"
- Do customers have the problem we think they have?
- Is our solution compelling enough to change behavior?
- Will they pay for it (or pay enough)?

#### 2. Usability Assumptions
"Can customers figure out how to use this?"
- Will they understand the core concept without training?
- Can they complete the key task without help?
- Does the UX match their mental model?

#### 3. Feasibility Assumptions
"Can we build this?"
- Do we have the technical capability?
- Can we build it within the time and budget constraints?
- Are there dependencies on third parties we don't control?

#### 4. Viability Assumptions
"Does this make business sense?"
- Is the market large enough to justify the investment?
- Can we acquire customers at a sustainable cost?
- Does this cannibalize existing revenue?

#### 5. GTM Assumptions
"Can we reach the right customers?"
- Do we have access to the target segment?
- Can we communicate the value clearly?
- Are there distribution or partnership dependencies?

## Assumption Mapping Process

### Step 1: Brain Dump
Write down every "we believe..." statement about your product idea. Aim for 20+.

### Step 2: Categorize
Assign each assumption to one of the five categories above.

### Step 3: Rate Each Assumption

For each assumption, score on two dimensions:
- **Risk** (1–5): How bad if we're wrong? 1 = minor inconvenience, 5 = project killer
- **Knowledge** (1–5): How little do we know? 1 = well-validated, 5 = pure guess

### Step 4: Prioritize

**Assumption Priority Matrix:**

```
         High Risk
              │
    Test now  │  Test now
    (quick)   │  (thorough)
              │
Low ──────────┼────────────► High
Knowledge     │              Unknown
              │
    Monitor   │  Test soon
    only      │
              │
         Low Risk
```

Top priority = High Risk + High Unknown.

## Output Format

Produce a numbered list of assumptions organized by category.

For each assumption:
```
[Category] Assumption #N
Statement: "We assume that [specific belief]"
Risk: [1–5] — [Why it's risky]
Knowledge: [1–5] — [What we know / don't know]
Priority: 🔴 Test immediately / 🟡 Test soon / 🟢 Monitor
Experiment idea: [One sentence on how to test this]
```

End with a prioritized top 5 list of the riskiest assumptions to test first, with recommended experiment types (interview, prototype, smoke test, A/B test, etc.).

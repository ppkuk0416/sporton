---
description: Run a structured ideation session for new or existing products using multi-lens brainstorming
argument-hint: "[new|existing] [product name or domain]"
---

# Brainstorm

Generate a diverse, prioritized set of product ideas using structured ideation frameworks.

## Step 1: Determine Context

Ask if not provided:
- Is this for a **new** product (greenfield) or an **existing** product (improvement/growth)?
- What is the product or domain?
- Who is the target customer?
- What outcome or metric are you trying to improve?
- Any constraints to keep in mind? (time, team size, tech stack)

## Step 2: Run Ideation

**For new products**: Activate the **brainstorm-ideas-new** skill.
Apply Jobs-to-be-Done, Pain-First, Technology Enablement, and Analogy Transfer lenses.

**For existing products**: Activate the **brainstorm-ideas-existing** skill.
Analyze core loops, retention drivers, feature adjacency, power user behaviors, and competitive gaps.

## Step 3: Score and Rank

Apply the scoring rubric:
- Desirability (D): 1–5
- Feasibility (F): 1–5
- Viability (V): 1–5

Rank ideas by total score. Flag any idea with a dimension below 2 as "needs validation before prioritization."

## Step 4: Shortlist and Next Steps

Present a shortlist of the top 5 ideas with:
- Idea name + one-liner
- Key hypothesis to validate
- Recommended validation method (interview / prototype / smoke test)
- Estimated effort (S / M / L)

Ask the user: "Which of these resonates most? Want to go deeper on any of them?"
If they pick one, offer to run `/pm-product-discovery:discover` for a full discovery cycle.

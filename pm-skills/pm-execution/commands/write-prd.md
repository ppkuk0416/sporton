---
description: Generate a complete Product Requirements Document (PRD) from a feature idea or brief description
argument-hint: "[feature name or description]"
---

# Write PRD

Generate a full, production-ready PRD for a feature or initiative.

## Step 1: Gather Context

If not fully provided, ask:
- What feature or initiative is this for?
- What problem does it solve for users?
- Who is the target user?
- What's the business goal?
- Any technical constraints or dependencies?
- What's the timeline?

## Step 2: Generate User Stories

Activate the **user-stories** skill.
Write 3–5 core user stories with acceptance criteria. Identify the primary user type and the most critical journey.

## Step 3: Write the PRD

Activate the **create-prd** skill.
Generate all 8 sections of the PRD. For any section with insufficient information, add a `[TBD]` note and specify exactly what's needed.

## Step 4: Risk Check

Activate the **pre-mortem** skill (abbreviated).
For this specific feature, surface the top 3 failure risks and add them to the PRD's Technical Considerations section.

## Step 5: Format and Deliver

Deliver the complete PRD as a markdown document ready to paste into Notion, Confluence, or Linear. Include at the top:
- Document status: Draft
- Next review date
- Open questions that need answers before moving to "In Review"

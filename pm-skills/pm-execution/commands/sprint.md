---
description: Plan a sprint with capacity estimation, story selection, and sprint goal definition
argument-hint: "[sprint number or dates] [team size]"
---

# Sprint

Run a complete sprint planning session.

## Step 1: Sprint Context

If not provided, ask:
- What sprint number or date range?
- How many developers on the team?
- What is the team velocity (average story points per sprint)?
- Any planned time off this sprint?
- What OKR or business goal is this sprint serving?
- What's in the backlog (high-priority items)?

## Step 2: Define the Sprint Goal

Start with the goal, not the stories. Draft the sprint goal in this format:
"By [last day of sprint], we will [outcome] so that [business reason]."

The sprint goal should be achievable with 60–80% of committed stories. The rest is buffer for uncertainty.

## Step 3: Plan the Sprint Backlog

Activate the **sprint-plan** skill.

Calculate team capacity. Select stories using WSJF or MoSCoW. Generate the sprint backlog table with points, owners, and dependencies.

Verify: Committed points ≤ team velocity. If over, ask which stories to drop.

## Step 4: Identify Blockers

For each story in the sprint, check:
- Any external dependencies? (design, data, APIs, other teams)
- Any unknowns that need a spike before work starts?
- Any stories that require decisions before coding begins?

Flag blockers explicitly and assign owners to resolve them by Day 1.

## Step 5: Daily Standup Template

Provide a ready-to-use standup format:
```
Sprint Goal: [Goal statement]
Days remaining: [X]

For each dev:
• Yesterday: [What I completed]
• Today: [What I'm working on]
• Blocked by: [Anything blocking me]

Sprint health: On track / At risk / Off track
```

## Step 6: Sprint Retrospective Prompts (for end of sprint)

Include 5 retrospective questions:
1. Did we achieve the sprint goal? Why or why not?
2. What slowed us down?
3. What should we start doing?
4. What should we stop doing?
5. What was the team's energy level? Why?

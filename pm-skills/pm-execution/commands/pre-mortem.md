---
description: Run a pre-mortem risk analysis before a launch or major initiative
argument-hint: "[project or feature name] [launch date]"
---

# Pre-Mortem

Run a structured pre-mortem to surface and mitigate risks before a launch.

## Step 1: Define the Project

Gather:
- What are we launching or starting?
- What does success look like?
- What is the launch/completion date?
- Who are the key stakeholders?
- What are the main bets we're making?

## Step 2: Run the Pre-Mortem

Activate the **pre-mortem** skill.

Generate failure scenarios across all six domains: Technical, Customer/UX, Execution, Market/Competitive, Organizational, and External. Aim for 4+ scenarios per domain.

## Step 3: Risk Priority Matrix

Score all scenarios (Probability × Impact × Detectability). Build the risk matrix. Identify the top 5 highest-priority risks.

## Step 4: Mitigation Plan

For each top-5 risk:
- Assign a mitigation owner
- Set a deadline for the mitigation action
- Define an early warning signal (what to monitor)
- Define a contingency (what we do if it happens anyway)

## Step 5: Go/No-Go Checklist

Create a launch readiness checklist:
- [ ] Top 5 risks have mitigations in place
- [ ] Rollback plan documented
- [ ] On-call rotation set for launch weekend
- [ ] Analytics instrumented and validated
- [ ] Customer support briefed
- [ ] Stakeholders notified

## Step 6: Deliver Risk Register

Produce a one-page risk register:

| Risk | Domain | Probability | Impact | Priority | Mitigation | Owner | Status |
|------|--------|-------------|--------|----------|------------|-------|--------|
| ...  | ...    | 1–5         | 1–5    | Score    | ...        | ...   | Open   |

Review this register in every standup during the two weeks before launch.

---
name: pre-mortem
description: Run a pre-mortem risk analysis to identify and mitigate failure scenarios before a project or launch begins.
---

# Pre-Mortem

Use when: the user is about to start a major initiative, launch a product, or kick off a sprint and wants to proactively identify failure risks.

Trigger: "pre-mortem", "risk analysis", "what could go wrong", "failure analysis", "launch risks", "project risks"

## Framework (Gary Klein — Prospective Hindsight)

A pre-mortem flips the perspective: instead of planning for success, imagine the project has already failed, then ask "Why did it fail?"

This technique is proven to surface risks that normal planning misses, because it removes optimism bias.

### Step 1: Set the Scene

Define the project or launch clearly:
- What are we shipping or doing?
- What does success look like?
- When is the deadline or launch date?
- Who is affected?

### Step 2: Travel to the Future

Instruct the team (or AI): "It is [launch date + 3 months]. The project has failed completely.
What went wrong?"

Generate failure scenarios across these six domains:

**1. Technical Failures**
- Infrastructure crashes at scale
- Performance worse than expected
- Integration with third-party breaks
- Data loss or corruption
- Security vulnerability exploited

**2. Customer/UX Failures**
- Users don't understand how to use it
- Value isn't delivered as expected
- Onboarding fails, causing early churn
- Wrong customer segment targeted
- Feature didn't solve the real pain

**3. Execution Failures**
- Timeline slips significantly
- Team loses key members mid-project
- Scope creep derails the core goal
- Cross-team dependencies stall progress
- Quality shortcuts create rework

**4. Market/Competitive Failures**
- Competitor launches something better first
- Market shifts away from the problem
- Regulatory change blocks the approach
- Customer acquisition cost too high

**5. Internal/Organizational Failures**
- Stakeholder misalignment late in the project
- Strategy changes mid-execution
- Budget gets cut
- Leadership doesn't support the launch

**6. External/Luck Failures**
- Major incident during launch window
- Key partner or API dependency breaks
- Economic downturn changes priorities

### Step 3: Prioritize Failure Scenarios

For each failure scenario:
- **Probability**: How likely is this? (1–5)
- **Impact**: How bad if it happens? (1–5)
- **Detectability**: How early will we know? (1–5, lower = harder to detect)

Priority score = Probability × Impact × (6 - Detectability)

### Step 4: Mitigation Planning

For each high-priority risk (score > 15):
```
Risk: [Failure scenario]
Early warning signal: [How we'd detect this early]
Mitigation: [What we do to reduce probability]
Contingency: [What we do if it happens anyway]
Owner: [Who monitors this]
```

### Step 5: Pre-Mortem Actions

Convert insights into concrete actions:
- What do we add to the project plan?
- What monitoring/alerts do we set up?
- What decisions do we make now to reduce future risk?

## Output Format

1. **Project snapshot**: What we're building, success criteria, launch date
2. **Failure scenarios**: Organized by domain, minimum 3 per domain
3. **Risk priority matrix**: Ranked by probability × impact × detectability
4. **Top 5 mitigations**: Concrete actions with owners and deadlines
5. **Pre-mortem dashboard**: One-page risk register to track through launch

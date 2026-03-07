---
name: cohort-analysis
description: Analyze retention and engagement patterns through cohort analysis, identifying trends and opportunities to improve long-term user value.
---

# Cohort Analysis

Use when: the user wants to understand retention curves, compare performance across user cohorts, identify churn triggers, or measure the impact of product changes on long-term engagement.

Trigger: "cohort analysis", "retention analysis", "retention curve", "D7 retention", "churn analysis", "user cohorts", "weekly retention"

## Framework

### Step 1: Define the Cohort and Metric

Cohort definition:
- **Time-based cohort**: Users who joined in the same week/month
- **Behavior-based cohort**: Users who completed a specific action (e.g., set up their first workspace)
- **Segment-based cohort**: Users in a specific plan, geo, or acquisition channel

Retention metric:
- **N-day retention**: % of users active exactly on Day N
- **Unbounded retention**: % of users active on Day N or later
- **Feature retention**: % of users who used a specific feature on Day N

### Step 2: Build the Retention Table

Standard cohort retention table:

| Cohort | Size | D1 | D7 | D14 | D30 | D60 | D90 |
|--------|------|----|----|-----|-----|-----|-----|
| Jan W1 | 1200 | 55% | 38% | 29% | 22% | 18% | 15% |
| Jan W2 | 980  | 52% | 35% | 27% | 19% | 16% | 13% |
| Feb W1 | 1450 | 58% | 42% | 33% | 26% | 21% | — |

### Step 3: Identify the Retention Curve Shape

**Healthy retention curve**: Drops steeply in the first week, then flattens and stabilizes. A flat long-term tail indicates product-market fit.

**Warning signs:**
- Curve never flattens (continuous churn): Product doesn't deliver enough value
- D1 drop > 80%: Onboarding failure
- Cliff at a specific day (e.g., D7): Trial expiration or habit trigger missing
- Declining across cohorts: Product quality deteriorating over time

### Step 4: Benchmarks by Industry

| Product Type | D1 | D7 | D30 |
|-------------|----|----|-----|
| Social / Consumer | 25–40% | 10–20% | 5–10% |
| Productivity / SaaS | 50–70% | 35–50% | 25–40% |
| Mobile Games | 30–40% | 10–20% | 5–10% |
| Marketplace | 20–35% | 10–18% | 8–15% |

### Step 5: Cohort Comparison Analysis

Compare retention across:
- **Acquisition channel**: Do organic users retain better than paid?
- **Onboarding path**: Do users who completed setup retain better?
- **Plan type**: Do annual subscribers retain better than monthly?
- **Time period**: Are recent cohorts performing better (improvement) or worse (degradation)?

### Step 6: Retention Improvement Opportunities

For each stage of the retention curve, identify the biggest lever:

**Day 0–1 (Activation)**: Is the onboarding getting users to the "aha moment" fast enough?
**Day 2–7 (Habit formation)**: Are there engagement nudges to bring users back?
**Day 8–30 (Stickiness)**: Is the core loop sticky enough? Are there power features users are missing?
**Day 31+ (Long-term value)**: Are users expanding usage? Are we delivering ongoing value?

## Output Format

1. **Cohort table**: Retention % by cohort and time period
2. **Retention curve chart** (described or ASCII): Visual shape of the retention curve
3. **Benchmarks comparison**: How your retention compares to industry norms
4. **Cohort comparison**: Retention differences by acquisition channel, plan, onboarding path
5. **Inflection points**: Days where retention drops most sharply — potential churn triggers
6. **Top 3 recommendations**: Specific product or UX changes to improve retention at each stage

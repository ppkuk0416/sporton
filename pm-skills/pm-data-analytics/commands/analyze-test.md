---
description: Analyze A/B test results for statistical significance and ship/no-ship recommendation
argument-hint: "[control vs treatment] [metric] [sample sizes and conversions]"
---

# Analyze Test

Evaluate A/B test results and deliver a clear ship/no-ship recommendation.

## Step 1: Gather Test Data

If not provided, ask:
- What was the hypothesis being tested?
- Control: How many users? How many conversions?
- Treatment: How many users? How many conversions?
- What is the primary metric?
- How long did the test run?
- What was the expected split (50/50)?

## Step 2: Run Statistical Analysis

Activate the **ab-test-analysis** skill.

Run all sanity checks (SRM, duration, novelty effect). Calculate statistical significance (Z-score or t-test). Calculate the 95% confidence interval for the true effect. Determine relative lift.

## Step 3: Practical Significance Check

Ask: Was a Minimum Detectable Effect (MDE) defined before the test? If yes, compare observed lift to MDE. If no, estimate the MDE based on business context (what lift is worth shipping?).

## Step 4: Segment Analysis

Break down results by:
- New vs. existing users
- Mobile vs. desktop
- High-value vs. low-value segment

Flag any segment where the treatment significantly underperforms.

## Step 5: Deliver Recommendation

Produce a clear decision memo:

---
**Experiment: [Name]**
**Duration**: [Dates]
**Metric**: [Primary metric]

**Results**:
| Variant | Users | Conversions | Rate | Lift |
|---------|-------|-------------|------|------|
| Control | ... | ... | ...% | — |
| Treatment | ... | ... | ...% | +X% |

**Statistical significance**: [p-value] → [Significant / Not significant] at 95% confidence
**Confidence interval**: [Lower, Upper]

**Recommendation**: 🟢 Ship / 🔴 Don't ship / 🟡 Extend test

**Rationale**: [2–3 sentence explanation]

**Caveats**: [Any warnings or segment issues]
---

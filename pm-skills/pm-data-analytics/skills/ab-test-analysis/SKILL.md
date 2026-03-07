---
name: ab-test-analysis
description: Analyze A/B test results with statistical significance, confidence intervals, and practical recommendations.
---

# A/B Test Analysis

Use when: the user has A/B test results and wants to understand if there's a statistically significant difference, calculate confidence intervals, or decide whether to ship the treatment.

Trigger: "A/B test", "experiment results", "statistical significance", "p-value", "confidence interval", "test analysis", "experiment analysis"

## Framework

### Step 1: Gather Test Data

Collect the following for each variant (Control and Treatment):
- Number of users exposed
- Number of conversions (or metric value)
- Conversion rate or mean metric value
- Test duration and dates

### Step 2: Sanity Checks

Before analyzing results:
- **Sample ratio mismatch (SRM)**: Expected 50/50 split? Check: |actual split - 50%| > 2% is a red flag
- **Test duration**: Ran for at least 1 full week to capture day-of-week effects?
- **Novelty effect**: Did the treatment spike early and then settle? (Novelty, not real lift)
- **Simultaneous experiments**: Any other tests running on the same user population?

### Step 3: Statistical Significance

**For proportion metrics (conversion rate):**

```
Z-score = (p_treatment - p_control) / sqrt(p_pooled × (1 - p_pooled) × (1/n_control + 1/n_treatment))

Where:
p_pooled = (conversions_control + conversions_treatment) / (n_control + n_treatment)

p-value lookup:
|Z| > 1.645 → significant at 90% confidence
|Z| > 1.960 → significant at 95% confidence
|Z| > 2.576 → significant at 99% confidence
```

**For mean metrics (e.g., revenue per user):**
Use a t-test. Report: t-statistic, degrees of freedom, p-value.

### Step 4: Practical Significance (Effect Size)

Statistical significance ≠ business significance.

Calculate the **relative lift**:
```
Relative lift = (treatment rate - control rate) / control rate × 100%
```

Define the **minimum detectable effect (MDE)** upfront — the smallest lift that's worth shipping. If the observed lift > MDE → ship. If not → don't ship (even if significant).

### Step 5: Confidence Interval

Report the 95% confidence interval for the true effect:
```
CI = (p_treatment - p_control) ± 1.96 × SE

SE = sqrt(p_treatment(1-p_treatment)/n_treatment + p_control(1-p_control)/n_control)
```

If the CI crosses zero → not confident the effect is real.

### Step 6: Segmentation Analysis

Break results by:
- New vs. returning users
- Platform (mobile vs. desktop)
- Key customer segments

Heterogeneous treatment effects (it works for some segments but not others) are important signals.

### Decision Framework

| Result | Action |
|--------|--------|
| Significant + practical lift | Ship |
| Significant + below MDE | Don't ship (not worth it) |
| Not significant + large sample | Null result — don't ship |
| Not significant + small sample | Need more data — extend test |
| SRM detected | Invalid test — investigate |
| Novelty effect suspected | Run longer — wait for stabilization |

## Output Format

1. **Test summary**: Variants, metric, sample sizes, duration
2. **Sanity checks**: SRM, duration, concurrent tests
3. **Results table**: Control vs. Treatment conversion rates + lift
4. **Statistical significance**: Z-score or t-statistic, p-value, confidence level
5. **Confidence interval**: Range for the true effect
6. **Segment breakdown**: Results by key segments
7. **Recommendation**: Ship / Don't ship / Need more data — with rationale

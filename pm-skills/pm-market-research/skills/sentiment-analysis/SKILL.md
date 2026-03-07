---
name: sentiment-analysis
description: Analyze customer feedback, reviews, and qualitative data to extract themes, sentiment patterns, and actionable insights.
---

# Sentiment Analysis

Use when: the user has a collection of customer feedback (reviews, survey responses, support tickets, interview notes) and wants to identify patterns, sentiment, and priorities.

Trigger: "analyze feedback", "sentiment analysis", "what are customers saying", "review analysis", "support ticket themes", "NPS analysis", "customer sentiment"

## Framework

### Step 1: Categorize by Sentiment

For each piece of feedback, assign:
- **Positive**: Customer expresses satisfaction, delight, praise
- **Negative**: Customer expresses frustration, disappointment, or dissatisfaction
- **Neutral/Mixed**: Factual observation or mixed sentiment

Tally totals. Calculate sentiment ratio:
- > 70% positive = generally healthy
- 50–70% = mixed signals, needs attention
- < 50% = critical issues to address

### Step 2: Theme Extraction

Cluster feedback into themes. Common PM feedback themes:

**Functional themes:**
- Feature requests (what's missing)
- Bugs and reliability issues
- Performance / speed complaints
- Integration / compatibility needs

**Experience themes:**
- Onboarding / learning curve
- UX clarity and discoverability
- Support responsiveness
- Documentation quality

**Value themes:**
- Pricing concerns
- ROI / value delivered
- Comparison to alternatives

For each theme:
- Count of mentions
- Sentiment breakdown within theme
- Representative quotes (verbatim)

### Step 3: Priority Matrix

Score each theme:
- **Frequency**: % of feedback mentioning this theme
- **Sentiment weight**: Negative feedback counts 2x (pain > praise in priority)
- **Strategic importance**: Does this theme affect retention, acquisition, or expansion revenue?

Priority = (Frequency × 2 if negative) × Strategic importance

### Step 4: Insight Extraction

For each high-priority theme, answer:
1. What is the underlying need or pain?
2. Is this a product issue, UX issue, or communication issue?
3. What would "fixed" look like?
4. Which customer segment mentions this most?

### Step 5: Action Recommendations

Translate insights into recommendations:
- **Fix immediately**: Negative themes affecting > 20% of feedback
- **Investigate**: Themes that are frequent but unclear in root cause
- **Track**: Themes that are growing in frequency
- **Celebrate**: Positive themes to protect and amplify

## Output Format

1. **Sentiment summary**: Total feedback count, sentiment ratio (Positive / Negative / Neutral)
2. **Theme frequency table**: Theme, count, %, dominant sentiment
3. **Top 5 themes deep-dive**: Quotes, root cause, priority score
4. **Action recommendations**: Categorized as Fix / Investigate / Track / Celebrate
5. **Segment breakdown**: If data allows, show sentiment by customer segment
6. **Trend note**: Any themes that appear to be growing or declining in frequency

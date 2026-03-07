---
name: market-sizing
description: Calculate TAM, SAM, and SOM using both top-down and bottom-up approaches with honest assumptions.
---

# Market Sizing

Use when: the user wants to estimate the market size, validate a business opportunity, prepare an investor pitch, or prioritize between market segments.

Trigger: "market sizing", "TAM SAM SOM", "how big is the market", "market opportunity", "addressable market"

## Framework

### TAM / SAM / SOM Definitions

- **TAM** (Total Addressable Market): The total revenue opportunity if you had 100% market share — globally, no constraints
- **SAM** (Serviceable Addressable Market): The portion of TAM you can realistically serve given your current product and go-to-market
- **SOM** (Serviceable Obtainable Market): The realistic share of SAM you can capture in 3–5 years

### Method 1: Top-Down Sizing

Start from industry reports and drill down:
1. Find a credible market size estimate (industry report, analyst data)
2. Apply filters to narrow to your SAM:
   - Geography filter: % of market in your target region
   - Segment filter: % of market that matches your target customer
   - Product category filter: % using your solution type
3. Apply realistic capture rate for SOM:
   - Early-stage: 1–5% of SAM
   - Growth: 5–15%
   - Market leader: 15–30%

### Method 2: Bottom-Up Sizing (More Credible)

Build from unit economics:
1. **Define the unit**: What's one customer? (company / user / seat)
2. **Count the universe**: How many potential customers exist?
   - Use proxies: LinkedIn company counts, job postings, industry databases
3. **Calculate revenue per unit**: ACV (Annual Contract Value) per customer
4. **Build up**: Units × ACV = TAM / SAM / SOM

```
Bottom-Up Model:

Total potential customers (global): [N]
Filter to SAM (your geo + segment): × [X%] = [SAM units]
Filter to SOM (3-year capture): × [Y%] = [SOM units]

Average ACV per customer: $[Z]

TAM = [N] × $[Z] = $[TAM]
SAM = [SAM units] × $[Z] = $[SAM]
SOM = [SOM units] × $[Z] = $[SOM]
```

### Sanity Checks

After calculating, run these checks:
- Does the TAM match what reputable sources say for the space?
- Is your SOM achievable given team size and runway?
- At your SOM, what's the implied market share? Is that realistic?
- What revenue does SOM represent by Year 3? Does that match your financial model?

### Assumptions Transparency

For each key assumption, document:
- The assumption value
- The range (optimistic / base / pessimistic)
- The source (data or reasoning)

A credible market size analysis shows its work.

## Output Format

1. **Market definition**: Precise description of what's included/excluded
2. **Top-down calculation**: With data sources and filters
3. **Bottom-up calculation**: With unit counts and ACV
4. **TAM / SAM / SOM summary table**:
   | Level | Size | Method | Confidence |
   |-------|------|--------|------------|
   | TAM   | $X B | Top-down | Medium |
   | SAM   | $X M | Bottom-up | High |
   | SOM (Y3) | $X M | Bottom-up | Medium |
5. **Key assumptions table**: Value, range, source
6. **Sanity checks**: Pass / Fail with notes
7. **Investor pitch framing**: One paragraph positioning this market size compellingly

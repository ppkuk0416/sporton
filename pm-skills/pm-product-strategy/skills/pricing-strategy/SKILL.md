---
name: pricing-strategy
description: Design a comprehensive pricing strategy using value-based, competitive, and behavioral pricing frameworks.
---

# Pricing Strategy

Use when: the user is setting prices for a new product, re-evaluating existing pricing, exploring new pricing models, or preparing a pricing proposal for stakeholders.

Trigger: "pricing strategy", "how should we price", "pricing model", "freemium vs paid", "raise prices", "pricing tiers"

## Framework

### Part 1: Pricing Model Selection

Choose the right pricing model for the product:

| Model | Best For | Example |
|-------|----------|---------|
| **Flat-rate** | Simple offering, easy to explain | Basecamp |
| **Per-seat/user** | Team tools, scales with org size | Slack, Notion |
| **Usage-based** | APIs, infrastructure, variable consumption | Stripe, AWS |
| **Tiered** | Multiple segments with different needs | HubSpot |
| **Freemium** | High distribution, upsell to paid | Spotify, Dropbox |
| **Outcome-based** | High-value B2B, share of gains | Some consulting tools |

For each candidate model, assess: alignment with customer value, sales motion complexity, revenue predictability, and churn risk.

### Part 2: Value-Based Pricing

Instead of cost-plus, anchor on value delivered:

1. **Identify the economic value** — What does your product help customers gain or avoid losing?
   - Revenue increase? Cost reduction? Time savings? Risk reduction?
2. **Quantify it** — "Our product saves a mid-market company $40K/year in manual work"
3. **Set price as a fraction of value** — Typical capture rate: 10–30% of value delivered
4. **Sanity check** — Compare to next best alternative's cost

### Part 3: Pricing Psychology

Apply behavioral pricing principles:
- **Anchoring**: Show a higher "comparison" price first
- **Decoy effect**: A middle tier makes the premium tier look more reasonable
- **Charm pricing**: $99 vs $100 — still works
- **Payment frequency**: Annual feels cheaper per month even if more total
- **Framing**: Per day (coffee) vs per month (abstract)

### Part 4: Pricing Tier Design

For tiered products, use the three-tier structure:

| Tier | Purpose | Target Customer | Key Features |
|------|---------|-----------------|--------------|
| **Starter** | Lead gen, trial | SMB, individuals | Core value, limited scale |
| **Growth** | Main revenue | Mid-market | Full features, moderate limits |
| **Enterprise** | High ACV | Large orgs | Unlimited + security + support |

Starter-to-Growth trigger: "You're hitting limits that the Growth plan removes."
Growth-to-Enterprise trigger: "You need compliance, SSO, or dedicated support."

### Part 5: Competitive Anchoring

Map your price vs. competitors on a 2×2:
- X-axis: Price (low to high)
- Y-axis: Value delivered (low to high)

Ideal position: higher value at similar or lower price than main competitor.

## Output Format

1. **Recommended Pricing Model** — With rationale (why this fits your product and market)
2. **Pricing Tiers** — Table with tier names, target segments, features, and price points
3. **Value Anchor** — Quantified value delivered and recommended price as % of value
4. **Psychological Framing** — How to present the price (payment frequency, comparison anchors)
5. **Competitive Map** — Position vs. 3 main competitors (value vs. price)
6. **Pricing Risks** — Top 2 risks with mitigation (e.g., "freemium delays monetization")
7. **Testing Recommendation** — How to A/B test the pricing before committing

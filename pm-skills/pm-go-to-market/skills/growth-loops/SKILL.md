---
name: growth-loops
description: Design and analyze self-reinforcing growth loops that compound over time — from viral loops to content loops.
---

# Growth Loops

Use when: the user wants to identify sustainable growth mechanisms, reduce reliance on paid acquisition, or design product features that drive compounding growth.

Trigger: "growth loop", "viral loop", "growth strategy", "word-of-mouth growth", "referral", "product-led growth", "compounding growth"

## Framework

### What Makes a Growth Loop

A growth loop is a closed system where output feeds back as input, creating compounding growth:
```
Acquire user → User takes action → Action generates new users → Repeat
```

Unlike linear channels (ads, outbound), loops compound. A loop with 100 users that generates 110 more users per cycle grows indefinitely.

### The Five Growth Loop Types

#### 1. Viral Loop
Users invite others, who become users.
```
User → Invites contacts → Contacts join → New users invite more contacts
```
- Trigger: Natural sharing moment in product flow
- Examples: Dropbox referral, Zoom meeting links, DocuSign signature requests
- Key metric: Viral coefficient (K) — must be > 1 for explosive growth, > 0.5 for meaningful contribution
- Design trigger: What moment would users naturally want to share?

#### 2. Usage Loop (Habit-Based)
Using the product makes it more valuable, which drives more usage.
```
Use product → Get more value → More usage → More value
```
- Trigger: Network effects or data accumulation
- Examples: Spotify (more listens → better recommendations), GitHub (more commits → better profile)
- Key metric: Feature depth per user (breadth of product used)

#### 3. Collaboration Loop
Users invite teammates/colleagues to work together.
```
User signs up → Invites team → Team collaborates → More teams join
```
- Trigger: Collaboration use case built into core product flow
- Examples: Slack, Figma, Notion, Linear
- Key metric: Team invitation rate, % of seats filled per account

#### 4. Content/SEO Loop
Product generates content that attracts search traffic, which drives new users.
```
User creates content → Content indexed → Search brings new users → New users create more content
```
- Trigger: User-generated content with SEO value
- Examples: Medium, Quora, ProductHunt, Airbnb listings
- Key metric: Organic content pieces created per user, organic traffic share

#### 5. Paid Loop
Revenue funds paid acquisition that brings in users who generate more revenue.
```
User pays → Revenue reinvested → Paid ads acquire users → More revenue
```
- Trigger: Positive unit economics (LTV > CAC)
- Key metric: CAC payback period, LTV:CAC ratio (must be > 3:1 to compound)

### Loop Design Process

1. **Identify natural sharing moments** in the product
2. **Map the loop**: Draw the cycle step by step
3. **Find the friction points**: Where does the loop break?
4. **Measure loop efficiency**:
   - What % of users complete each step?
   - What's the loop cycle time?
   - What's the conversion at each step?
5. **Optimize the bottleneck**: Improve the step with lowest conversion first

## Output Format

1. **Existing loop analysis**: What growth loops (if any) exist today, with current efficiency
2. **Recommended loops**: 1–2 loops to build or strengthen, with rationale
3. **Loop diagram**: Step-by-step cycle for each recommended loop
4. **Efficiency model**: Expected conversion at each step, estimated K-factor or multiplier
5. **Product changes needed**: What to build or change to enable each loop
6. **Loop metrics**: What to track to know if the loop is working

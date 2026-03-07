---
description: Generate a privacy policy for a digital product covering GDPR and CCPA compliance
argument-hint: "[product name] [company name] [data types collected e.g. email, analytics, payments]"
---

# Privacy Policy

Generate a comprehensive privacy policy for a digital product.

## Step 1: Gather Product Details

If not provided, ask:
- What is the product name and company name?
- What type of product? (Web app / mobile app / website / SaaS)
- What data do you collect? (Email, analytics, payments, location, etc.)
- Do you operate in the EU? (GDPR compliance needed)
- Do you operate in California or have California users? (CCPA needed)
- Do you have users under 13? (COPPA compliance needed)
- What third-party services do you use? (Google Analytics, Stripe, Mixpanel, etc.)
- Who is the data controller contact?

## Step 2: Generate the Policy

Activate the **privacy-policy** skill.

Generate the complete privacy policy with all sections. Apply GDPR sections if EU/UK operation confirmed. Apply CCPA sections if California users confirmed.

## Step 3: Add Third-Party Services

For each third-party service mentioned:
- What data they receive
- Link to their own privacy policy
- How to opt out

Common services to cover:
- Google Analytics → Privacy controls + opt-out
- Stripe → Payment data handling
- Intercom / HubSpot → Communication data
- AWS / GCP → Infrastructure hosting

## Step 4: Format and Deliver

Produce the policy as:
1. A full markdown document ready to copy to a webpage
2. A summary table: Data type → Purpose → Retention period
3. A cookie table: Cookie name → Type → Expiry → Purpose

**Always include the legal disclaimer**: "Review with a qualified lawyer before publishing."

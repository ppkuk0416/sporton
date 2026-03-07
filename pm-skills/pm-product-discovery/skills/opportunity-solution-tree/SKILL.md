---
name: opportunity-solution-tree
description: Build a Teresa Torres-style Opportunity Solution Tree (OST) that links outcomes to opportunities and solutions.
---

# Opportunity Solution Tree

Use when: the user wants to map product opportunities, visualize discovery work, connect outcomes to solutions, or structure their product strategy using the OST framework.

## Framework (Teresa Torres)

An OST has four levels:
1. **Desired Outcome** — The business metric or behavior you want to move
2. **Opportunities** — Unmet customer needs, pain points, or desires that stand in the way
3. **Solutions** — Ideas that address a specific opportunity
4. **Experiments** — Tests that validate assumptions about a solution

## How to Build an OST

### Step 1: Define the Desired Outcome
Ask: "What metric or behavior change do we want to achieve this quarter?"
- Frame as: increase/decrease/improve [metric] by [amount] by [date]
- Examples: Increase weekly active users by 20%, Reduce churn below 5%

### Step 2: Map Opportunities (Needs-Based)
For each outcome, list 4–8 opportunities using the Jobs-to-be-Done format:
- "When [situation], I want to [motivation], so I can [expected outcome]"
- Avoid solution language — opportunities are customer needs, not features

### Step 3: Cluster Opportunities
Group related opportunities into themes. Prioritize the top 1–2 themes using:
- Reach: How many customers face this need?
- Impact: How strongly does solving it move the outcome?
- Confidence: How certain are we this is a real need?

### Step 4: Generate Solutions
For each prioritized opportunity, brainstorm 3–5 solutions:
- Think small (experiments), medium (features), and large (bets)
- Solutions should directly address the opportunity statement

### Step 5: Map Assumptions
For each solution, list the risky assumptions:
- Value: Will customers want this?
- Usability: Can they figure out how to use it?
- Feasibility: Can we build it?
- Viability: Does it make business sense?
- GTM: Can we reach the right customers?

### Step 6: Prioritize Experiments
Select experiments that test the riskiest assumptions first using the matrix:
- High risk + High unknowns = Run immediately
- Low risk + High unknowns = Schedule next
- Already validated = Skip

## Output Format

```
DESIRED OUTCOME
└── [Outcome statement]

OPPORTUNITIES
├── Opportunity A: [Need statement]
│   ├── Solution A1: [Idea]
│   │   └── Assumption: [Risk]
│   └── Solution A2: [Idea]
│       └── Assumption: [Risk]
└── Opportunity B: [Need statement]
    └── Solution B1: [Idea]
        └── Assumption: [Risk]

NEXT EXPERIMENT
└── [Experiment to run this sprint]
```

Present the OST as a structured tree with clear parent-child relationships. Include a summary of which opportunity cluster to focus on and why.

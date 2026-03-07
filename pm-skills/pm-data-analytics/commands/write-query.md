---
description: Generate a SQL query from a natural language data question
argument-hint: "[data question] [database dialect: BigQuery|PostgreSQL|MySQL|Snowflake]"
---

# Write Query

Generate production-ready SQL from a plain English data question.

## Step 1: Understand the Question

If not clear, ask:
- What business question are you trying to answer?
- What tables are available (if known)?
- What SQL dialect? (BigQuery / PostgreSQL / MySQL / Snowflake / SQL Server)
- What should one row in the result represent?
- Any specific filters? (date range, segment, product area)

## Step 2: Generate the SQL

Activate the **sql-queries** skill.

Write the query with:
- Clear aliasing (no ambiguous column names)
- Inline comments explaining non-obvious logic
- CTEs (WITH clause) for readability when the query has multiple steps
- Appropriate dialect-specific functions

## Step 3: Validate Logic

Before delivering the query, self-check:
- Does the GROUP BY match all non-aggregated SELECT columns?
- Are NULLs handled appropriately?
- Does the JOIN type (INNER / LEFT / RIGHT) match the intended logic?
- Could this query be expensive at scale? If yes, add optimization note.

## Step 4: Deliver with Explanation

Provide:
1. The SQL query (formatted and commented)
2. Plain English explanation of what the query does
3. Assumed table and column names (with note to adjust)
4. Sample output format (what the result would look like)
5. Any optimization recommendations (indexes, partitioning)

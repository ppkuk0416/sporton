---
name: sql-queries
description: Generate SQL queries from natural language descriptions, supporting BigQuery, PostgreSQL, MySQL, Snowflake, and SQL Server.
---

# SQL Queries

Use when: the user wants to write a SQL query, translate a data question into SQL, or optimize an existing query. Supports multi-dialect SQL generation.

Trigger: "SQL query", "write SQL", "query the database", "data pull", "how do I query", "BigQuery", "PostgreSQL", "Snowflake"

## Framework

### Step 1: Understand the Data Question

Before writing SQL, confirm:
- What business question is being answered?
- What tables are involved (if known)?
- What is the time range or filters?
- What should the output look like? (Row per user? Aggregated metric? Daily trend?)
- Which SQL dialect? (BigQuery / PostgreSQL / MySQL / Snowflake / SQL Server)

### Step 2: Translate to SQL Logic

Map the business question to SQL components:
- **What to measure** → SELECT columns
- **From where** → FROM / JOIN tables
- **Under what conditions** → WHERE filters
- **Grouped how** → GROUP BY dimensions
- **In what order** → ORDER BY
- **How many rows** → LIMIT

### Common PM Query Patterns

**Daily Active Users (DAU):**
```sql
SELECT
  DATE(event_timestamp) AS date,
  COUNT(DISTINCT user_id) AS dau
FROM events
WHERE event_name = 'session_start'
  AND event_timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1
ORDER BY 1
```

**Retention by Cohort (Week 1):**
```sql
WITH cohorts AS (
  SELECT user_id, DATE_TRUNC(MIN(created_at), WEEK) AS cohort_week
  FROM users
  GROUP BY user_id
),
activity AS (
  SELECT DISTINCT user_id, DATE_TRUNC(event_date, WEEK) AS active_week
  FROM events
)
SELECT
  c.cohort_week,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  COUNT(DISTINCT a.user_id) AS retained_week1,
  ROUND(COUNT(DISTINCT a.user_id) / COUNT(DISTINCT c.user_id), 3) AS retention_rate
FROM cohorts c
LEFT JOIN activity a
  ON c.user_id = a.user_id
  AND a.active_week = DATE_ADD(c.cohort_week, INTERVAL 1 WEEK)
GROUP BY 1
ORDER BY 1
```

**Funnel Conversion:**
```sql
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN user_id END) AS step_1,
  COUNT(DISTINCT CASE WHEN event_name = 'signup_started' THEN user_id END) AS step_2,
  COUNT(DISTINCT CASE WHEN event_name = 'signup_completed' THEN user_id END) AS step_3,
  COUNT(DISTINCT CASE WHEN event_name = 'first_purchase' THEN user_id END) AS step_4
FROM events
WHERE event_timestamp >= TIMESTAMP('2026-01-01')
```

### Dialect Differences to Handle

| Feature | BigQuery | PostgreSQL | MySQL | Snowflake |
|---------|----------|------------|-------|-----------|
| Date functions | `DATE_TRUNC`, `DATE_SUB` | `DATE_TRUNC`, `INTERVAL` | `DATE_FORMAT`, `DATEDIFF` | `DATE_TRUNC`, `DATEADD` |
| String concat | `CONCAT()` | `\|\|` | `CONCAT()` | `CONCAT()` |
| Null handling | `IFNULL` | `COALESCE` | `IFNULL` | `NVL` |
| Limit | `LIMIT` | `LIMIT` | `LIMIT` | `LIMIT` |

## Output Format

1. **SQL query**: Formatted, readable, with comments explaining key sections
2. **Plain English explanation**: What the query does, step by step
3. **Assumptions**: What table names and column names are assumed
4. **Sample output**: What the result set would look like (headers + 2–3 example rows)
5. **Optimization notes**: Index recommendations or performance tips if relevant

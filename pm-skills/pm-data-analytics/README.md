# pm-data-analytics

Data analytics skills for product managers: SQL generation, A/B test analysis, and cohort retention analysis.

## Overview

This plugin enables PMs to work confidently with data — writing SQL queries, analyzing experiment results with statistical rigor, and understanding retention patterns through cohort analysis.

## Install

```bash
claude plugin install pm-data-analytics
```

## Skills

| Skill | Description |
|-------|-------------|
| `sql-queries` | Generate SQL from natural language (BigQuery, PostgreSQL, MySQL, Snowflake) |
| `ab-test-analysis` | Statistical significance, confidence intervals, and ship/no-ship decisions |
| `cohort-analysis` | Retention curves, cohort comparisons, and improvement recommendations |

## Commands

| Command | Description |
|---------|-------------|
| `/pm-data-analytics:write-query` | Generate a SQL query from a plain English question |
| `/pm-data-analytics:analyze-test` | Analyze A/B test results with a ship/no-ship recommendation |

## Example Usage

```
/pm-data-analytics:write-query show me DAU trend for the last 30 days BigQuery

/pm-data-analytics:analyze-test onboarding flow test control: 5000 users 420 conversions treatment: 5100 users 485 conversions
```

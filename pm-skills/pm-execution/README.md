# pm-execution

Core PM execution skills: PRDs, OKRs, sprint planning, roadmaps, and risk analysis.

## Overview

This plugin operationalizes the full PM execution cycle — from writing specs to planning sprints, setting goals, and managing risk. Based on Marty Cagan's (Inspired) execution principles, Google's OKR methodology, and agile best practices.

## Install

```bash
claude plugin install pm-execution
```

## Skills

| Skill | Description |
|-------|-------------|
| `create-prd` | Write an 8-section PRD with goals, stories, requirements, and launch plan |
| `user-stories` | Write user stories with acceptance criteria (INVEST + Gherkin format) |
| `brainstorm-okrs` | Design ambitious, measurable OKRs aligned to business strategy |
| `sprint-plan` | Plan a sprint with capacity estimation and story prioritization |
| `outcome-roadmap` | Transform feature lists into outcome-based Now/Next/Later roadmaps |
| `pre-mortem` | Surface failure scenarios and mitigations before a launch |

## Commands

| Command | Description |
|---------|-------------|
| `/pm-execution:write-prd` | Generate a complete PRD from a feature idea |
| `/pm-execution:plan-okrs` | Design team or company OKRs for the next quarter |
| `/pm-execution:sprint` | Plan a sprint with capacity, backlog, and goals |
| `/pm-execution:pre-mortem` | Run a risk analysis before a launch or initiative |

## Example Usage

```
/pm-execution:write-prd collaborative commenting feature for our design tool

/pm-execution:plan-okrs Growth team Q2 2026 focused on retention

/pm-execution:sprint Sprint 24 March 10-21 team of 4 devs

/pm-execution:pre-mortem mobile app launch April 15
```

---
name: create-prd
description: Write a complete Product Requirements Document (PRD) using an 8-section framework that balances context, requirements, and success criteria.
---

# Create PRD

Use when: the user needs to write a PRD, spec, or requirements document for a feature, product, or initiative.

Trigger: "write a PRD", "product requirements", "spec for", "feature document", "requirements document"

## Framework (8-Section PRD)

A great PRD answers: What are we building, why, for whom, and how do we know we're done?

### Section 1: Overview
- **Problem statement**: What user problem or business opportunity are we addressing?
- **Why now**: What makes this the right time to solve this?
- **Scope**: What's in and what's explicitly out of scope?
- **Owner**: PM name, team, engineering lead

### Section 2: Goals & Success Metrics
- **Business goal**: What business metric does this move?
- **User goal**: What does the user achieve?
- **Success metrics**: 2–3 measurable KPIs with baseline and target
  - Primary: [Metric] from [X] to [Y] by [date]
  - Secondary: [Metric] maintained above [threshold]
  - Guardrail: [Metric] must not decrease below [floor]

### Section 3: Background & Context
- **User research summary**: Key findings supporting this decision
- **Current state**: How does this work today?
- **Previous attempts**: What has been tried before? Why did it fail or change?
- **Related work**: Links to discovery docs, customer interviews, data analysis

### Section 4: User Stories & Jobs-to-be-Done
For each primary user type:
```
As a [user type],
When [situation/trigger],
I want to [action/capability],
So I can [desired outcome].

Acceptance Criteria:
- Given [context], when [action], then [result]
- Given [context], when [action], then [result]
```

### Section 5: Requirements
**Functional Requirements** (must-haves):
- FR-01: [Requirement] — Priority: P0/P1/P2
- FR-02: [Requirement] — Priority: P0/P1/P2

**Non-Functional Requirements**:
- Performance: [e.g., page loads in < 2s at P95]
- Reliability: [e.g., 99.9% uptime SLA]
- Security: [e.g., PII encrypted at rest]
- Accessibility: [e.g., WCAG 2.1 AA]

**Out of Scope** (explicitly excluded):
- [Item 1] — deferred to [future date/phase]

### Section 6: Design & UX
- Link to Figma / prototype
- Key UX decisions and rationale
- Edge cases and error states
- Empty states and loading states

### Section 7: Technical Considerations
- **Architecture notes**: Key technical decisions (written with engineering)
- **Dependencies**: Other teams, services, or APIs required
- **Data model changes**: Schema additions or modifications
- **Risks**: Technical risks and mitigation plans

### Section 8: Launch Plan
- **Rollout strategy**: % rollout, feature flags, kill switch
- **A/B test plan**: If applicable — control vs. treatment, sample size
- **Comms plan**: Who needs to know before launch?
- **Support readiness**: FAQ, documentation, CS training
- **Rollback plan**: How to revert if something goes wrong

## Output Format

Generate the full PRD in markdown format with all 8 sections populated. For any section with insufficient information, mark it `[TBD — needs: X]` and specify what input is required. Include a header with: Document version, Status (Draft / In Review / Approved), Last updated date.

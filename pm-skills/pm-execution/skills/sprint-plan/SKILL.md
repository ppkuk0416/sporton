---
name: sprint-plan
description: Create a structured sprint plan with capacity estimation, story selection, and sprint goal definition.
---

# Sprint Plan

Use when: the user wants to plan a sprint, prioritize the sprint backlog, estimate team capacity, or run a sprint planning ceremony.

Trigger: "sprint plan", "sprint planning", "plan sprint", "sprint backlog", "next sprint"

## Framework

### Step 1: Sprint Goal

Define ONE clear sprint goal:
- What is the team trying to achieve this sprint?
- Why does it matter? (Link to OKR or business outcome)
- How will we know we succeeded?

Format: "By [end of sprint], we will [outcome] so that [business reason]."

Good: "By Friday, users can invite teammates by email so that we unlock viral growth."
Bad: "Complete 12 story points across 5 features."

### Step 2: Capacity Planning

Calculate available capacity:
```
Team capacity = Σ (developer hours available)

For each developer:
- Working days in sprint: [X days]
- Hours per day available for sprint work: [Y hours] (typically 6, not 8)
- Planned time off / meetings: [-Z hours]
- Available hours: X × Y - Z

Subtract:
- Code reviews: ~10% of total
- Bug fixes / incidents: ~10–15% of total
- Technical debt: [agreed %]

Net sprint capacity: [hours]
```

### Step 3: Story Selection

Prioritize using WSJF (Weighted Shortest Job First):
```
WSJF = (User value + Time criticality + Risk reduction) / Job size

Score each dimension 1–8 (Fibonacci):
- User value: How much does this help users?
- Time criticality: How costly is delay?
- Risk reduction: Does delaying increase risk?
- Job size: Story points estimate
```

Alternatively, use simple MoSCoW:
- **Must**: Required for sprint goal
- **Should**: High value, fits capacity
- **Could**: Nice-to-have if time permits
- **Won't**: Deferred to next sprint

### Step 4: Sprint Backlog

For each story in the sprint:
```
| Story ID | Title | Owner | Points | Dependencies | Status |
|----------|-------|-------|--------|--------------|--------|
| US-01    | ...   | ...   | 3      | —            | Todo   |
```

Confirm: Total story points ≤ team velocity (average of last 3 sprints).

### Step 5: Risk Identification

For the current sprint plan:
- What's the biggest risk to not completing the sprint goal?
- Are there any external dependencies that could block work?
- What stories are most uncertain (high T-shirt size variability)?

### Step 6: Definition of Done

Agree on the team's Definition of Done:
- [ ] Code written and passing CI
- [ ] Unit tests written and passing
- [ ] Code reviewed by at least one peer
- [ ] QA tested on staging
- [ ] Feature flagged (if needed)
- [ ] Analytics event validated
- [ ] Accessibility checked
- [ ] Product demo'd and approved

## Output Format

Generate the sprint plan document:
1. **Sprint header**: Sprint #, dates, team, sprint goal
2. **Capacity table**: Per-developer availability
3. **Sprint backlog**: Full story list with points and owners
4. **Point totals**: Committed points vs. capacity
5. **Sprint risks**: Top 3 risks and mitigations
6. **DoD checklist**: Team's Definition of Done

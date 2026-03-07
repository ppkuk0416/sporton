---
name: user-stories
description: Write complete user stories with acceptance criteria using the standard As-a/I-want/So-that format plus Gherkin-style Given/When/Then.
---

# User Stories

Use when: the user needs to write user stories, acceptance criteria, or break down a feature into development tasks.

Trigger: "user stories", "write stories", "acceptance criteria", "break down this feature", "Gherkin", "Given When Then"

## Framework

### Story Format

```
Story ID: US-[number]
Title: [Short, action-oriented name]
Priority: P0 (must-have) / P1 (should-have) / P2 (nice-to-have)
Points: [Fibonacci: 1, 2, 3, 5, 8, 13]

As a [specific user type, not "user"]
When [trigger or situation]
I want to [specific action or capability]
So that [concrete outcome or benefit]

Acceptance Criteria:
- Given [precondition], when [action], then [result]
- Given [precondition], when [action], then [result]
- Given [edge case], when [action], then [result]

Definition of Done:
□ Implemented and tested
□ Code reviewed
□ Unit tests pass
□ Accessibility verified
□ Analytics event fired
```

### Story Quality Checklist (INVEST)

Each story should be:
- **I**ndependent: Can be developed without depending on other stories
- **N**egotiable: Not a contract — details can change
- **V**aluable: Delivers value to the user or business
- **E**stimable: Team can size it
- **S**mall: Completable in one sprint
- **T**estable: Has clear acceptance criteria

### Story Splitting Patterns

When a story is too large (> 8 points), split by:
1. **Workflow steps**: Happy path → edge cases → error states
2. **User types**: Admin view → end-user view → guest view
3. **Data variations**: Simple case → complex case → bulk case
4. **Operations**: Create → read → update → delete
5. **Rules**: Basic rules → complex rules → exceptions

### Edge Cases to Always Consider

For every story, explicitly cover:
- Empty state (no data yet)
- Error state (network failure, validation error)
- Loading state (async operations)
- Permissions (unauthorized access)
- Mobile/responsive behavior
- Accessibility (keyboard navigation, screen reader)

## Output Format

Generate stories as a numbered list. For each story include all fields from the template above. Group stories by user type or epic. End with a summary table:

| ID | Title | Priority | Points | Dependencies |
|----|-------|----------|--------|--------------|
| US-01 | ... | P0 | 3 | — |

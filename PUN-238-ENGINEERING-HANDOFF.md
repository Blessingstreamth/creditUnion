# PUN-238 Engineering Handoff (CTO -> Engineer)

## Scope for Engineer
Implement redesign MVP from `PUN-238-REDESIGN-BRIEF.md` with focus on:
- Dashboard
- Loan List
- Loan Detail
- Approval Queue

## Required Deliverables
- New UI structure with reusable components
- Tokenized style constants (color, spacing, typography)
- Role-aware dashboard variants
- Empty/loading/error states on all touched screens
- QA checklist with screenshots (iOS + Android)

## Technical Constraints
- Keep existing business logic intact
- Separate presentational components from data fetching
- No direct API shape assumptions in UI components (use mapper layer)
- Preserve backward-compatible navigation routes where feasible

## Suggested Implementation Plan
1. Create `design-tokens` module and shared UI primitives
2. Refactor navigation shell + tab structure
3. Rebuild Loan List + Loan Detail flows
4. Rebuild Approval queue/detail flows
5. Integrate dashboard role variants
6. Run smoke QA on target flows

## Acceptance Criteria
- Visual consistency follows redesign brief
- No regression in login, loan list loading, loan detail view, approval action
- Mobile layout works at common widths without clipping
- Build/test smoke passes for touched areas

## Test Cases (Minimum)
- Login -> Dashboard renders correct role variant
- Loan list filters update list correctly
- Loan detail repayment schedule visible and readable
- Approval action submits and shows updated status
- Error state retry path works when API fails

## Remaining after Engineer delivery (CTO)
- Architecture review
- UX polish pass
- Final acceptance and closure on parent issue

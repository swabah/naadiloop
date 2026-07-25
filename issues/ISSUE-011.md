# ISSUE-011 — Responsive Layout, Branding & Loop Visualization

**Blocked by:** 010 (Edge Cases & Error Handling)
**PRD refs:** §7, §13, §15, §18

## Why

The completed workflow must be understandable at a glance on both a Provider's laptop and a Patient's phone. Visual polish should reinforce the two human gates and the closed-loop metaphor without obscuring operational information.

## Scope

### Backend / Logic scope

- Expose only the aggregate counts needed by visualizations if current procedures do not already provide them.
- Derive visualization values from the same dashboard/journey data used by lists; do not create a second source of truth.
- Add no speculative analytics or production KPI claims.

### Frontend / UI scope

- Apply the PRD §13 color tokens exactly.
- Use Inter for UI and optionally Fraunces only for wordmark/hero treatment.
- Reserve purple `gate` styling for verification and report review.
- Add a closed-loop progress visualization to the Patient experience.
- Add a compact Provider flow/status visualization using Recharts only where it improves comprehension.
- Polish phone, tablet, and laptop layouts and retain accessible shadcn/Radix interactions.
- Standardize calm, plain-language Patient and operational Provider copy.

## Acceptance Criteria

- [ ] Theme tokens match the PRD hex values exactly.
- [ ] Gate purple appears only at the two human-gate interactions.
- [ ] Patient next action and progress are clear at a phone viewport.
- [ ] Provider dashboard and review flow work at a typical laptop viewport.
- [ ] Visual progress/counts exactly match underlying visible actions.
- [ ] Closed and completed states are distinguishable from awaiting review.
- [ ] Keyboard focus, labels, contrast, and dialog behavior retain baseline accessibility.
- [ ] No chart implies diagnosis, clinical risk, or unsupported outcome statistics.
- [ ] Both Provider and Patient views preserve the Naadi Loop terminology in `CONTEXT.md`.

## Risks / Open Questions

- Visualization work must not displace critical workflow correctness.
- The circular indicator must remain understandable without relying on color alone.


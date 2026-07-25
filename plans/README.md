# Plans

This directory holds one **implementation plan** per issue, written just before work on that issue starts — not earlier (requirements can still shift while an issue is blocked) and not later (never start editing code without one).

## When to write a plan

As soon as an issue's blocker lands in `done/`, create `plans/ISSUE-00X-plan.md` before writing any implementation code. If you want a head start while still blocked, it's fine to draft the plan early — just re-check it against the blocker's final `done/` state before implementing, since the blocker's actual shape (types, function signatures, component props) is what the plan should be written against, not the blocker's issue description.

## What a plan contains

A plan is concrete enough that someone other than its author could execute it. At minimum:

1. **Restate the goal** in one or two sentences — copy the issue's "why," don't reinterpret it.
2. **Interface first**: the exact types, function signatures, or component props this issue introduces or consumes, written before any implementation detail. This is where `codebase-design` thinking belongs (see `../workflow.md`) — get the seam right before filling it in.
3. **File-by-file steps**: every file to create or touch, in the order they should be touched, with a one-line note on what changes.
4. **Test / verification approach**: for pure logic (calculators, the tradeoff engine), this means the test cases that prove correctness — see `workflow.md`'s TDD guidance. For UI, this means the manual check against each acceptance criterion in the issue, and a note on which breakpoints/themes to eyeball.
5. **Risks or open questions** the author isn't fully sure about — flag them rather than silently picking an answer, especially anything touching a number a judge might question (see PRD §18).

## When a plan is done

The plan is superseded the moment the issue moves to `done/` — at that point, both the issue file and its plan move together (`git mv issues/ISSUE-00X.md plans/ISSUE-00X-plan.md done/`). This directory should only ever contain plans for issues that are *currently in progress*; an empty `plans/` directory means nothing is actively being built, not that nothing has ever been planned.

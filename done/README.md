# Done

Completed issues live here, each as a pair: the original ticket and the plan that implemented it.

```
done/ISSUE-00X.md          ← the ticket, unchanged from issues/
done/ISSUE-00X-plan.md     ← the plan that was actually executed (amend it if reality diverged)
```

## Moving an issue here

An issue graduates from `plans/` to `done/` only when:

1. Every acceptance criterion listed in the issue file has been verified true — not "the code exists," but "the behavior is confirmed" (run the app, check the case, don't take the diff's word for it).
2. The change has been through the review gate described in `../workflow.md` (Standards + Spec check, per the `code-review` skill).
3. If the plan's steps changed during implementation — which is normal — the plan file has been updated to reflect what was actually built, so `done/` stays a true record rather than a stale intention.

Move both files together in one commit:

```
git mv issues/ISSUE-00X.md done/ISSUE-00X.md
git mv plans/ISSUE-00X-plan.md done/ISSUE-00X-plan.md
```

## Why this exists

`done/` is the project's build log. Anyone — a teammate joining mid-hackathon, a judge asking "how did you build this," a future contributor picking the project back up — should be able to read this directory top to bottom and reconstruct exactly what was built, in what order, and why, without needing to dig through git history.

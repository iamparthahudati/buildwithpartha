# Backlog workflow

## Statuses

| Status | Entry rule | Exit rule |
| --- | --- | --- |
| Backlog | Ticket exists but may still need refinement. | Dependencies/context/acceptance/tests are complete enough for readiness review. |
| Ready | Small, unambiguous, dependencies Done, owner/context known. | Assignee creates the exact feature branch and records start. |
| In Progress | Active work on one ticket branch. | Definition of done and ticket acceptance pass; handoff/status updated. |
| In Review | Pull request is complete and checks are green. | Required review is approved; findings resolved or ticket returns to In Progress. |
| QA | Review passed and behavior is available in the applicable integration/staging environment. | Required automated/manual evidence passes or defects reopen the ticket. |
| Done | Merged to `develop`, documentation/handoff complete. | Final state; follow-up work uses a new ticket. |

`Blocked` is a flag, not a terminal status. Record the blocker, owner, date and exact condition that unblocks the ticket while leaving its workflow state visible.

## Priorities

- P0: production/security incident or work that blocks all useful progress.
- P1: phase-critical capability or serious defect.
- P2: normal planned work.
- P3: optional improvement with no current phase gate impact.

## Estimates

- S: focused, low-risk change with one primary behavior.
- M: several related states/layers but still one reviewable outcome.
- L: upper limit for one ticket; requires explicit test plan and can still fit one focused pull request.
- Larger than L: split before Ready.

Estimates are relative planning aids, not promises of hours.

## Ready checklist

- Ticket ID/title/type/phase/priority/estimate are present.
- Outcome and boundaries are observable.
- Dependencies are Done or explicitly sequenced.
- Exact permanent context is linked.
- Positive, negative, permission, responsive, accessibility and recovery criteria are included when relevant.
- Verification and documentation/handoff work are named.
- Ticket is no larger than L and contains no unrelated cleanup.

## Status ledger

The authoritative local ledger is `docs/backlog/STATUS.md`. Update it at start, handoff and merge. When a remote tracker is configured, it may mirror the ledger, but ticket IDs and Git history remain authoritative and the two cannot silently diverge.


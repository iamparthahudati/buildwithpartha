# EPIC-00 — Governance and repository readiness

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-0001 | Approve project charter | Review vision, v1 outcomes, non-goals, measures, and privacy posture with the owner. Record approved changes; charter has no unresolved launch-blocking ambiguity. | None | S | Done |
| LOS-0002 | Approve permanent product context | Validate name, route contract, modules, vocabulary, user ownership, timezone rule, and reference-image boundary. All future tickets can link this instead of restating context. | LOS-0001 | S | Done |
| LOS-0003 | Establish `master` and `develop` safely | Reconcile the existing `main` history with the requested branch model without losing the current website. Protect `master`/`develop`, document default branch and recovery; verify refs before any rename/delete. | LOS-0001 | S | Done |
| LOS-0004 | Add repository contribution rules | Add PR/issue templates, CODEOWNERS/owner rule, commit convention, and ticket checklist. Templates require acceptance, validation, migrations/config, screenshots only if useful, and handoff. | LOS-0002, LOS-0003 | S | Done |
| LOS-0005 | Create backlog status workflow | Configure or document Backlog→Ready→In Progress→Review→QA→Done and priority/estimate labels. Every ticket ID is unique and traceable to branch/PR. | LOS-0004 | S | Done |
| LOS-0006 | Establish ADR workflow | Add ADR template/index and numbering rules. Architecture/security/product deviations cannot merge without an accepted/superseded decision record. | LOS-0002 | S | Done |
| LOS-0007 | Define versioning and changelog | Adopt semantic LifeOS tags, release notes sections, migration/rollback notes, and unreleased log. A sample phase release can be followed without oral steps. | LOS-0003 | S | Done |
| LOS-0008 | Define environment inventory | Document local, test, staging, production boundaries; owners; data policy; URLs; secrets classes. No environment shares production credentials or real production data by default. | LOS-0002 | S | Done |
| LOS-0009 | Define documentation freshness checks | Add link/ID validation and owners for core docs. CI fails broken local links or duplicate ticket IDs; stale status is visible. | LOS-0004 | S | Done |
| LOS-0010 | Run Phase 0 governance gate | Audit tickets 0001–0009 and simulate a ticket start/handoff/release. Record pass/fail evidence and open specific defects before Phase 1. | LOS-0001–LOS-0009 | S | Done |


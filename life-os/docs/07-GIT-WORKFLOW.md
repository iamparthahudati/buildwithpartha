# Git and release workflow

## Permanent branches

- `master`: exact production history. Protected; pull requests only.
- `develop`: integration branch for the next phase/release. Protected; pull requests only.
- `feature/*`: one ticket, branched from and merged back to `develop`.
- `release/*`: optional stabilization branch when a phase needs more than a direct PR.
- `hotfix/*`: urgent production repair, branched from `master`, merged to both `master` and `develop`.

The existing repository currently uses `main`; bootstrap ticket LOS-0003 reconciles it safely with the required `master` convention before LifeOS implementation begins.

## Names

- Feature: `feature/LOS-1234-short-description`
- Release: `release/life-os-v0.1.0`
- Hotfix: `hotfix/LOS-1234-short-description`
- Commit: `feat(tasks): LOS-1234 add task-row component`
- PR: `[LOS-1234] Add task-row component`

## Ticket flow

`Backlog -> Ready -> In Progress -> In Review -> QA -> Done`.

Only `Ready` tickets may start. A ticket becomes Ready when its description, context, dependencies, acceptance criteria, and test expectations are complete.

## Merge rules

- Pull the latest `develop` before opening the PR and resolve conflicts on the feature branch.
- Required checks: formatting, lint, typecheck, unit tests, relevant integration/contract tests, build, secret scan.
- At least one approval when another reviewer exists.
- Squash merge feature branches; the squash message keeps the ticket ID.
- Delete merged feature branches.
- Never combine unrelated cleanup or another ticket in the PR.

## Phase release

1. Complete every phase ticket and its review-gate ticket on `develop`.
2. Freeze scope; update changelog, migrations, deployment notes, and rollback instructions.
3. Deploy `develop`/release candidate to staging and run the phase test plan.
4. Open PR from `develop` (or release branch) to `master`.
5. After merge, tag `life-os-vX.Y.Z`, deploy that exact commit, run smoke checks, and record the deployment.

## Hotfix

Branch from `master`, implement the smallest safe repair, validate, merge to `master`, deploy/tag, then merge/cherry-pick the same change into `develop`. Record why normal flow was bypassed.


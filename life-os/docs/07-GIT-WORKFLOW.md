# Git and release workflow

## Permanent branches

- `master`: exact production history. Protected; pull requests only.
- `develop`: integration branch for the next phase/release. Protected; pull requests only.
- `feature/*`: one ticket, branched from and merged back to `develop`.
- `release/*`: optional stabilization branch when a phase needs more than a direct PR.
- `hotfix/*`: urgent production repair, branched from `master`, merged to both `master` and `develop`.

## Bootstrap state

On 2026-08-16, LOS-0003 created `master` and `develop` from the existing `main` commit without renaming or deleting `main`. This preserves the existing website history and establishes the requested LifeOS flow. Initial planning tickets were then merged into `develop`; `master` remains the production baseline until the first completed phase release.

LOS-0212 connected the documented workflow to the GitHub remote. `develop` is the default branch during active development. Both `develop` and `master` require up-to-date pull requests, the four LifeOS CI checks and resolved conversations; administrators are included, while direct/force pushes and branch deletion are blocked. The reproducible settings live in `scripts/configure-branch-protection.sh`.

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
- Required hosted contexts: `LifeOS / Documentation`, `LifeOS / Frontend`, `LifeOS / Backend`, and `LifeOS / Secret scan`.
- At least one approval when another reviewer exists.
- Squash merge feature branches; the squash message keeps the ticket ID.
- Delete merged feature branches.
- Never combine unrelated cleanup or another ticket in the PR.

Remote protection is configured to:

- block direct pushes and force pushes to `master` and `develop`;
- require pull requests, required CI checks, resolved conversations, and up-to-date branches;
- restrict deletion of permanent branches;
- set the repository default branch to `develop` during active development or `master` if production governance requires it, recording the choice;
- require signed commits/tags if the selected Git host and owner workflow support them reliably.

## Phase release

1. Complete every phase ticket and its review-gate ticket on `develop`.
2. Freeze scope; update changelog, migrations, deployment notes, and rollback instructions.
3. Deploy `develop`/release candidate to staging and run the phase test plan.
4. Open PR from `develop` (or release branch) to `master`.
5. After merge, tag `life-os-vX.Y.Z`, deploy that exact commit, run smoke checks, and record the deployment.

## Hotfix

Branch from `master`, implement the smallest safe repair, validate, merge to `master`, deploy/tag, then merge/cherry-pick the same change into `develop`. Record why normal flow was bypassed.

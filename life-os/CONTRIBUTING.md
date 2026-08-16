# Contributing to LifeOS

## Start a ticket

1. Read `AGENTS.md`, `docs/CURRENT-STATUS.md`, the ticket's epic row, and linked context.
2. Confirm the ticket is Ready and dependencies are Done.
3. Update local `develop` and create `feature/LOS-####-short-name`.
4. Keep one ticket and one outcome in the branch.

## While implementing

- Follow component-first and backend-authorization rules.
- Add tests with the behavior, not after the branch is otherwise complete.
- Update API/domain/design documentation when a contract changes.
- Preserve unrelated work and do not commit credentials, production data or generated build output.

## Before review

- Run the ticket checks and global definition of done.
- Rebase or merge the latest `develop` according to the team's chosen policy; resolve conflicts on the feature branch.
- Add/update `docs/handoffs/LOS-####.md` and `docs/CURRENT-STATUS.md`.
- Open a pull request using the template and link the ticket.

## Review and merge

Feature branches merge into `develop` after checks and review. Phase releases merge `develop` into `master` only after the phase gate. Hotfixes branch from `master` and are merged back into both permanent branches.


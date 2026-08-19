# LOS-0518 grace-period follow-up handoff

- Status: Done
- Branch: `develop`
- Date: 2026-08-20

## Why

The originally shipped LOS-0518 (`AccountDeletionService.deleteAccount`) purged the account row
synchronously in the same request, with no recovery window. That contradicts the ticket's own
acceptance contract ("Confirm/re-auth, **grace period/cancel path**, revoke sessions, hide
account, purge/anonymize...") and `docs/31-PRIVACY-DATA-LIFECYCLE.md`'s accepted ADR-012 state
machine, which requires `ACTIVE -> DELETE_REQUESTED -> GRACE_PERIOD (30 days, cancellable) ->
PURGE_IN_PROGRESS -> PURGED_LIVE`. This ticket implements that state machine.

## Completed behavior

- **Backend**:
  - `V7__account_deletion_grace_period_schema.sql`: adds `PENDING_DELETION` to
    `users.account_status`, and a new `account_deletion_requests` ledger table (grace period
    status, single-use cancellation token hash, `scheduled_purge_at`). Deliberately no foreign key
    to `users` — the row is kept as minimal deletion evidence after the user row is purged, per the
    privacy spec's R6/R8 retention classes.
  - `AccountDeletionGracePeriod` (`auth.domain`) + `AccountDeletionGracePeriodRepository` port +
    JPA adapter, mirroring `EmailVerificationToken`'s single-use-token shape exactly, including the
    atomic conditional-update pattern (`UPDATE ... WHERE status = 'GRACE_PERIOD'`) for both cancel
    and purge, so a cancellation racing the purge job can never both win.
  - `User.requestDeletion`/`restoreFromPendingDeletion`: the account row is no longer deleted on
    request — it moves to `PENDING_DELETION` (so `LoginService`, which only authenticates
    `ACTIVE` accounts, stops authenticating it) and is restored to `ACTIVE` on cancellation.
  - `AccountDeletionService.deleteAccount` now re-authenticates, revokes sessions, enters the
    grace period, and emails a cancellation link — it no longer deletes anything.
  - `CancelAccountDeletionService.cancel` consumes the single-use cancellation token and restores
    the account, mirroring `EmailVerificationService.verify`'s race-safe shape.
  - `AccountDeletionPurgeService` + `AccountDeletionPurgeJob` (daily `@Scheduled` sweep, matching
    `OutboxCleanupJob`/`ExportFileCleanupJob`'s pattern) purges accounts whose grace period has
    elapsed uncancelled — this is the only place `userRepository.deleteById` is called now.
  - New public endpoint `POST /auth/cancel-deletion` (unauthenticated, like `verify-email`).
  - `SecurityController.deleteAccount`'s response changed: `status` is now `GRACE_PERIOD`
    (previously `DELETED`), and it returns `scheduledPurgeAt` alongside `requestedAt`.
- **Frontend**:
  - `PrivacySettingsPanel`: danger-zone copy and the confirmation dialog now accurately describe
    the 30-day grace period instead of claiming immediate, irreversible deletion. On success, the
    dialog shows the scheduled purge date and an explicit "check your email to cancel" notice
    instead of redirecting straight to the login page.
  - New `AccountDeletionCancelScreen` (`features/settings`): the landing page for the emailed
    cancellation link, consuming the token on mount (verifying/cancelled/invalid/expired/
    already-used/error states), mirroring `VerifyEmailScreen`'s shape.

## Files and contracts changed

- Backend: `V7__account_deletion_grace_period_schema.sql`; `auth.domain.AccountDeletionGracePeriod`,
  `AccountDeletionGracePeriodRepository`, `AccountDeletionRequestStatus`; `auth.infrastructure`
  entity/JPA-repository/adapter for the above; `auth.application.AccountDeletionService` (rewritten),
  `CancelAccountDeletionService`, `AccountDeletionPurgeService`, `AccountDeletionPurgeJob`,
  `AccountDeletionOutcome`; `auth.api.AccountDeletionResponse` (new field), `CancelAccountDeletionRequest`,
  `CancelAccountDeletionResponse`; `AuthController`/`SecurityController`/`ApiSecurityConfiguration`/
  `SessionAuthenticationFilter` wiring for the new endpoint; `AccountStatus`/`User` domain changes;
  test doubles and rewritten tests in `auth.application`/`auth.api`; `test/resources/schema.sql`.
- Frontend: `features/settings/model/privacy.ts`, `api/privacyApi.ts`,
  `hooks/useCancelAccountDeletion.ts`, `components/PrivacySettingsPanel.tsx` (+ test),
  `components/AccountDeletionCancelScreen.tsx` (+ test + css), `index.ts`.

## Validation performed

- Backend: fresh `./gradlew clean check --no-build-cache` (spotless, checkstyle, JaCoCo coverage
  verification, full test suite including `IdentitySecurityGateIntegrationTests`) — BUILD SUCCESSFUL.
- Frontend: full suite 1313/1313 passing (131 files); `verify:quality`
  (format/lint/typecheck/boundaries/tokens) clean; `build:test` and 35/35 node integration tests pass.

## Known limitations or follow-ups

- `AccountDeletionCancelScreen` is built and tested in isolation, like every other auth screen —
  mounting it at `/life-os/cancel-deletion` happens when routing is assembled (LOS-0603).
- The 30-day period and the `ACCOUNT_DELETION` background-job audit marker are engineering
  defaults per ADR-012, not yet legally reviewed, matching the same caveat every other token TTL
  in this codebase carries.

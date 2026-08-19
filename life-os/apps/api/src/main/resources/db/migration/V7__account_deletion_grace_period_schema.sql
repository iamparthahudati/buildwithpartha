-- LOS-0518 follow-up: account deletion grace period.
-- Corrects the initial implementation, which purged the account row synchronously on
-- request with no recovery window. 31-PRIVACY-DATA-LIFECYCLE.md's accepted ADR-012 state
-- machine requires ACTIVE -> DELETE_REQUESTED -> GRACE_PERIOD (30 days, cancellable) ->
-- PURGE_IN_PROGRESS -> PURGED_LIVE. This migration adds the PENDING_DELETION account
-- status and the ledger table that tracks each grace period and its single-use
-- cancellation token.

ALTER TABLE public.users
    DROP CONSTRAINT ck_users_account_status;

ALTER TABLE public.users
    ADD CONSTRAINT ck_users_account_status CHECK (
        account_status IN ('UNVERIFIED', 'ACTIVE', 'PENDING_DELETION', 'SUSPENDED', 'DELETED')
    );

COMMENT ON COLUMN public.users.account_status IS
    'UNVERIFIED | ACTIVE | PENDING_DELETION | SUSPENDED | DELETED';

-- ---------------------------------------------------------------------------
-- account_deletion_requests
-- ---------------------------------------------------------------------------
-- No foreign key to public.users(id): a purged request row is retained afterward as
-- minimal deletion evidence (opaque former account id, timestamps, outcome) per
-- 31-PRIVACY-DATA-LIFECYCLE.md's R6/R8 retention classes, which requires it to outlive
-- the user row it refers to.
CREATE TABLE public.account_deletion_requests (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL,
    status                  TEXT        NOT NULL DEFAULT 'GRACE_PERIOD',
    cancellation_token_hash TEXT        NOT NULL,
    requested_at            TIMESTAMPTZ NOT NULL,
    scheduled_purge_at      TIMESTAMPTZ NOT NULL,
    cancelled_at            TIMESTAMPTZ,
    purged_at               TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_account_deletion_requests PRIMARY KEY (id),
    CONSTRAINT uq_account_deletion_requests_token UNIQUE (cancellation_token_hash),
    CONSTRAINT ck_account_deletion_requests_status CHECK (
        status IN ('GRACE_PERIOD', 'CANCELLED', 'PURGED')
    )
);

CREATE INDEX ix_account_deletion_requests_user_id
    ON public.account_deletion_requests (user_id);

-- Supports the daily purge sweep: WHERE status = 'GRACE_PERIOD' AND scheduled_purge_at <= now()
CREATE INDEX ix_account_deletion_requests_due
    ON public.account_deletion_requests (scheduled_purge_at)
    WHERE status = 'GRACE_PERIOD';

COMMENT ON TABLE  public.account_deletion_requests IS
    'One row per requested account deletion: the 30-day grace period, its single-use cancellation token, and the eventual purge outcome.';
COMMENT ON COLUMN public.account_deletion_requests.user_id IS
    'Opaque reference to the account; not a foreign key, since this row outlives the purged user row as minimal deletion evidence.';
COMMENT ON COLUMN public.account_deletion_requests.status IS
    'GRACE_PERIOD | CANCELLED | PURGED';
COMMENT ON COLUMN public.account_deletion_requests.cancellation_token_hash IS
    'Hash of the single-use cancellation token emailed to the account holder; the raw value is never persisted.';
COMMENT ON COLUMN public.account_deletion_requests.scheduled_purge_at IS
    'requested_at + 30 days. The daily AccountDeletionPurgeJob purges any request still in GRACE_PERIOD past this instant.';

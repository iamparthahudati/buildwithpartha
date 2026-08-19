-- LOS-1403: Background job framework.
-- Persistent queue for scheduled/async jobs (data export, account deletion, etc.).
-- Jobs are enqueued transactionally inside the triggering write; dispatched asynchronously
-- by the job worker. Payload is erased once a job reaches a terminal state (R1,
-- 31-PRIVACY-DATA-LIFECYCLE.md). Terminal rows are purged after 7 days.

CREATE TABLE public.background_jobs (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID,
    job_kind            TEXT        NOT NULL,
    payload             TEXT        NOT NULL DEFAULT '{}',
    status              TEXT        NOT NULL DEFAULT 'PENDING',
    attempt_count       INTEGER     NOT NULL DEFAULT 0,
    next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_attempt_at     TIMESTAMPTZ,
    last_error_class    TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    dead_lettered_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_background_jobs         PRIMARY KEY (id),
    CONSTRAINT fk_background_jobs_user    FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT ck_background_jobs_kind    CHECK (
        job_kind IN ('DATA_EXPORT', 'ACCOUNT_DELETION')
    ),
    CONSTRAINT ck_background_jobs_status  CHECK (
        status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED')
    ),
    CONSTRAINT ck_background_jobs_attempt_count CHECK (attempt_count >= 0)
);

-- Supports the worker's due-message poll:
--   SELECT ... FROM background_jobs WHERE status = 'PENDING' AND next_attempt_at <= now()
--     ORDER BY next_attempt_at LIMIT :batchSize FOR UPDATE SKIP LOCKED
CREATE INDEX ix_background_jobs_pending
    ON public.background_jobs (next_attempt_at)
    WHERE status = 'PENDING';

-- Supports the R1 cleanup query:
--   DELETE FROM background_jobs WHERE status IN ('SUCCEEDED','DEAD_LETTERED')
--     AND updated_at < now() - interval '7 days'
CREATE INDEX ix_background_jobs_cleanup
    ON public.background_jobs (updated_at)
    WHERE status IN ('SUCCEEDED', 'DEAD_LETTERED');

CREATE INDEX ix_background_jobs_user_id
    ON public.background_jobs (user_id);

COMMENT ON TABLE  public.background_jobs IS 'Persistent background job queue: data export, account deletion, and future async work.';
COMMENT ON COLUMN public.background_jobs.job_kind IS 'DATA_EXPORT | ACCOUNT_DELETION; selects the handler at runtime.';
COMMENT ON COLUMN public.background_jobs.payload IS 'JSON-encoded job-specific input; erased to ''{}'' once status reaches SUCCEEDED or DEAD_LETTERED (R1, 31-PRIVACY-DATA-LIFECYCLE.md).';
COMMENT ON COLUMN public.background_jobs.status IS 'PENDING | RUNNING | SUCCEEDED | FAILED | DEAD_LETTERED.';
COMMENT ON COLUMN public.background_jobs.last_error_class IS 'Sanitized exception class name from the most recent failed attempt; never the raw exception message.';
COMMENT ON COLUMN public.background_jobs.started_at IS 'Set when the worker claims the job (status → RUNNING).';
COMMENT ON COLUMN public.background_jobs.completed_at IS 'Set when the job reaches SUCCEEDED.';
COMMENT ON COLUMN public.background_jobs.dead_lettered_at IS 'Set when the retry budget is exhausted.';

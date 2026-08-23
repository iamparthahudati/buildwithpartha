-- LOS-1404: typed, content-free product Activity Events and restricted Security Audit Events.

CREATE TABLE public.product_activity_events (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL,
    actor_user_id  UUID        NOT NULL,
    event_type     VARCHAR(64) NOT NULL,
    subject_type   VARCHAR(32) NOT NULL,
    subject_id     UUID        NOT NULL,
    correlation_id VARCHAR(64) NOT NULL,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_product_activity_events PRIMARY KEY (id),
    CONSTRAINT fk_product_activity_events_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT ck_product_activity_actor_is_owner CHECK (actor_user_id = user_id),
    CONSTRAINT ck_product_activity_subject_type CHECK (subject_type IN ('PROJECT', 'TASK')),
    CONSTRAINT ck_product_activity_event_type CHECK (event_type IN (
        'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'PROJECT_RESTORED',
        'PROJECT_DELETED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED',
        'TASK_ARCHIVED', 'TASK_RESTORED', 'TASK_DELETED', 'SUBTASK_CREATED',
        'SUBTASK_UPDATED', 'SUBTASK_COMPLETED', 'SUBTASK_DELETED', 'COMMENT_CREATED',
        'COMMENT_UPDATED', 'COMMENT_DELETED'
    )),
    CONSTRAINT ck_product_activity_correlation_id CHECK (
        correlation_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'
    )
);

CREATE INDEX ix_product_activity_subject
    ON public.product_activity_events (user_id, subject_type, subject_id, occurred_at DESC, id DESC);
CREATE INDEX ix_product_activity_user_time
    ON public.product_activity_events (user_id, occurred_at DESC, id DESC);

COMMENT ON TABLE public.product_activity_events IS
    'User-readable, content-free product history. Private content is never stored as event metadata.';

CREATE TABLE public.security_audit_events (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    event_type      VARCHAR(64) NOT NULL,
    outcome         VARCHAR(16) NOT NULL,
    actor_user_id   UUID,
    subject_user_id UUID,
    target_type     VARCHAR(32),
    target_id       UUID,
    correlation_id  VARCHAR(64) NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,

    CONSTRAINT pk_security_audit_events PRIMARY KEY (id),
    CONSTRAINT ck_security_audit_outcome CHECK (outcome IN ('SUCCEEDED', 'DENIED', 'FAILED')),
    CONSTRAINT ck_security_audit_event_type CHECK (event_type IN (
        'ACCOUNT_CREATED', 'SIGN_IN', 'SIGN_OUT', 'EMAIL_VERIFIED', 'PASSWORD_CHANGED',
        'PASSWORD_RESET', 'SESSIONS_REVOKED', 'ACCOUNT_DELETION_REQUESTED',
        'ACCOUNT_DELETION_CANCELLED', 'ACCOUNT_PURGED', 'AUTHORIZATION_DENIED',
        'RECORD_DELETED', 'EXPORT_REQUESTED', 'EXPORT_DOWNLOADED'
    )),
    CONSTRAINT ck_security_audit_target_type CHECK (
        target_type IS NULL OR target_type IN (
            'ACCOUNT', 'SESSION', 'PROJECT', 'TASK', 'COMMENT', 'EXPORT', 'SYSTEM'
        )
    ),
    CONSTRAINT ck_security_audit_target_pair CHECK (
        (target_type IS NULL AND target_id IS NULL)
        OR (target_type IS NOT NULL AND target_id IS NOT NULL)
    ),
    CONSTRAINT ck_security_audit_correlation_id CHECK (
        correlation_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'
    ),
    CONSTRAINT ck_security_audit_expiry CHECK (expires_at > occurred_at)
);

CREATE INDEX ix_security_audit_expiry ON public.security_audit_events (expires_at);
CREATE INDEX ix_security_audit_subject_time
    ON public.security_audit_events (subject_user_id, occurred_at DESC, id DESC)
    WHERE subject_user_id IS NOT NULL;

COMMENT ON TABLE public.security_audit_events IS
    'Restricted content-free security evidence retained until its explicit R6 expiry.';

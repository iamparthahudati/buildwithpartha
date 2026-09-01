-- LOS-1310: Private file attachment storage, metadata, quotas, and security scanning schema.
-- Stores metadata, ownership, storage keys, entity links, and scan lifecycle status for attachments.
-- Binary payloads remain in private S3 object storage; database stores metadata and references.
-- All records cascade delete when the owning user row is removed.

CREATE TABLE IF NOT EXISTS public.attachments (
    id                         UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id                    UUID        NOT NULL,
    entity_type                TEXT        NOT NULL,
    entity_id                  UUID        NOT NULL,
    file_name                  TEXT        NOT NULL,
    sanitized_file_name        TEXT        NOT NULL,
    content_type               TEXT        NOT NULL,
    file_size_bytes            BIGINT      NOT NULL,
    storage_key                TEXT        NOT NULL,
    status                     TEXT        NOT NULL DEFAULT 'PENDING_SCAN',
    scan_result                TEXT,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at                 TIMESTAMPTZ,

    CONSTRAINT pk_attachments           PRIMARY KEY (id),
    CONSTRAINT fk_attachments_user      FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT ck_attachments_entity_type CHECK (
        entity_type IN ('TASK', 'PROJECT')
    ),
    CONSTRAINT ck_attachments_status    CHECK (
        status IN ('PENDING_SCAN', 'CLEAN', 'QUARANTINED', 'DELETED')
    ),
    CONSTRAINT ck_attachments_size      CHECK (file_size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS ix_attachments_user_id
    ON public.attachments (user_id);

CREATE INDEX IF NOT EXISTS ix_attachments_entity
    ON public.attachments (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS ix_attachments_status
    ON public.attachments (status);

-- Update background job kind constraint to support ATTACHMENT_SCAN
ALTER TABLE public.background_jobs DROP CONSTRAINT IF EXISTS ck_background_jobs_kind;
ALTER TABLE public.background_jobs ADD CONSTRAINT ck_background_jobs_kind CHECK (
    job_kind IN ('DATA_EXPORT', 'ACCOUNT_DELETION', 'ATTACHMENT_SCAN')
);

-- Update security audit event types to support attachment events
ALTER TABLE public.security_audit_events DROP CONSTRAINT IF EXISTS ck_security_audit_event_type;
ALTER TABLE public.security_audit_events ADD CONSTRAINT ck_security_audit_event_type CHECK (event_type IN (
    'ACCOUNT_CREATED', 'SIGN_IN', 'SIGN_OUT', 'EMAIL_VERIFIED', 'PASSWORD_CHANGED',
    'PASSWORD_RESET', 'SESSIONS_REVOKED', 'ACCOUNT_DELETION_REQUESTED',
    'ACCOUNT_DELETION_CANCELLED', 'ACCOUNT_PURGED', 'AUTHORIZATION_DENIED',
    'RECORD_DELETED', 'EXPORT_REQUESTED', 'EXPORT_DOWNLOADED',
    'ATTACHMENT_UPLOADED', 'ATTACHMENT_DOWNLOADED', 'ATTACHMENT_QUARANTINED'
));

COMMENT ON TABLE  public.attachments IS 'Private attachment metadata and lifecycle status for tasks and projects.';
COMMENT ON COLUMN public.attachments.entity_type IS 'TASK | PROJECT; entity domain target.';
COMMENT ON COLUMN public.attachments.status IS 'PENDING_SCAN | CLEAN | QUARANTINED | DELETED.';
COMMENT ON COLUMN public.attachments.storage_key IS 'S3 object key: attachments/{userId}/{attachmentId}.';

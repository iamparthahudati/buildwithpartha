-- LOS-1402: Transactional mail outbox.
-- Enqueued in the same DB transaction as the triggering write; dispatched asynchronously by the
-- mail worker. Duplicate delivery is harmless. template_variables is erased once a message leaves
-- PENDING (delivered or dead-lettered); terminal rows are purged after 7 days (retention class R1,
-- 31-PRIVACY-DATA-LIFECYCLE.md).

CREATE TABLE public.outbox_messages (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID,
    message_kind         TEXT        NOT NULL,
    recipient_email      TEXT        NOT NULL,
    template_variables   TEXT        NOT NULL DEFAULT '{}',
    status               TEXT        NOT NULL DEFAULT 'PENDING',
    attempt_count        INTEGER     NOT NULL DEFAULT 0,
    next_attempt_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_attempt_at      TIMESTAMPTZ,
    last_error_class     TEXT,
    provider_message_id  TEXT,
    sent_at              TIMESTAMPTZ,
    dead_lettered_at     TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_outbox_messages         PRIMARY KEY (id),
    CONSTRAINT fk_outbox_messages_user    FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT ck_outbox_messages_kind    CHECK (
        message_kind IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'SECURITY_ALERT')
    ),
    CONSTRAINT ck_outbox_messages_status  CHECK (
        status IN ('PENDING', 'SENT', 'DEAD_LETTERED')
    ),
    CONSTRAINT ck_outbox_messages_attempt_count CHECK (attempt_count >= 0)
);

-- Supports the worker's due-message poll:
--   SELECT ... FROM outbox_messages WHERE status = 'PENDING' AND next_attempt_at <= now()
--     ORDER BY next_attempt_at LIMIT :batchSize
CREATE INDEX ix_outbox_messages_pending
    ON public.outbox_messages (next_attempt_at)
    WHERE status = 'PENDING';

-- Supports the R1 cleanup query:
--   DELETE FROM outbox_messages WHERE status IN ('SENT','DEAD_LETTERED') AND updated_at < now() - interval '7 days'
CREATE INDEX ix_outbox_messages_cleanup
    ON public.outbox_messages (updated_at)
    WHERE status IN ('SENT', 'DEAD_LETTERED');

CREATE INDEX ix_outbox_messages_user_id
    ON public.outbox_messages (user_id);

COMMENT ON TABLE  public.outbox_messages IS 'Transactional mail outbox: verification/reset/security messages enqueued in the same DB transaction as the triggering write.';
COMMENT ON COLUMN public.outbox_messages.message_kind IS 'EMAIL_VERIFICATION | PASSWORD_RESET | SECURITY_ALERT; selects the bundled template.';
COMMENT ON COLUMN public.outbox_messages.template_variables IS 'JSON-encoded render-time substitution values (may include a single-use raw token URL); erased to ''{}'' once status leaves PENDING (R1, 31-PRIVACY-DATA-LIFECYCLE.md).';
COMMENT ON COLUMN public.outbox_messages.status IS 'PENDING | SENT | DEAD_LETTERED. PENDING covers both not-yet-attempted and awaiting-retry.';
COMMENT ON COLUMN public.outbox_messages.last_error_class IS 'Sanitized exception class name only from the most recent failed attempt; never the raw exception message.';
COMMENT ON COLUMN public.outbox_messages.provider_message_id IS 'JavaMail-generated Message-ID header captured after send, for delivery troubleshooting; plain SMTP has no server-assigned id to read back.';

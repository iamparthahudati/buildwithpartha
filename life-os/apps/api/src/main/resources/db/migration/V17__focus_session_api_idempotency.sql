-- LOS-0913: bounded, content-free idempotency records for Focus Session writes.

ALTER TABLE public.focus_session_interruptions
    ADD CONSTRAINT uq_focus_session_interruptions_id_user_id UNIQUE (id, user_id);

CREATE TABLE public.focus_session_operations (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL,
    idempotency_key   VARCHAR(64) NOT NULL,
    operation_type    TEXT        NOT NULL,
    focus_session_id  UUID        NOT NULL,
    interruption_id   UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_focus_session_operations PRIMARY KEY (id),
    CONSTRAINT uq_focus_session_operations_user_key UNIQUE (user_id, idempotency_key),
    CONSTRAINT fk_focus_session_operations_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_focus_session_operations_session_owner
        FOREIGN KEY (focus_session_id, user_id)
        REFERENCES public.focus_sessions (id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_focus_session_operations_interruption_owner
        FOREIGN KEY (interruption_id, user_id)
        REFERENCES public.focus_session_interruptions (id, user_id) ON DELETE CASCADE,
    CONSTRAINT ck_focus_session_operations_key CHECK (
        idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$'
    ),
    CONSTRAINT ck_focus_session_operations_type CHECK (
        operation_type IN (
            'START', 'PAUSE', 'RESUME', 'START_BREAK', 'RESUME_FOCUS',
            'COMPLETE', 'CANCEL', 'RECORD_INTERRUPTION'
        )
    ),
    CONSTRAINT ck_focus_session_operations_interruption CHECK (
        (operation_type = 'RECORD_INTERRUPTION' AND interruption_id IS NOT NULL)
        OR (operation_type <> 'RECORD_INTERRUPTION' AND interruption_id IS NULL)
    )
);

CREATE INDEX ix_focus_session_operations_created_at
    ON public.focus_session_operations (created_at);

COMMENT ON TABLE public.focus_session_operations IS
    'Content-free Focus Session mutation replay keys, deleted after seven days.';

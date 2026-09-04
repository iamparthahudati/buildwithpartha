-- LOS-1408: generic idempotency records for approved creates and job submissions.

CREATE TABLE public.idempotency_records (
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL,
    idempotency_key   VARCHAR(64)  NOT NULL,
    operation_type    VARCHAR(100) NOT NULL,
    status            VARCHAR(32)  NOT NULL,
    response_code     INTEGER,
    response_body     TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ  NOT NULL,

    CONSTRAINT pk_idempotency_records PRIMARY KEY (id),
    CONSTRAINT uq_idempotency_records_user_key UNIQUE (user_id, idempotency_key),
    CONSTRAINT fk_idempotency_records_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT ck_idempotency_records_key CHECK (
        idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$'
    ),
    CONSTRAINT ck_idempotency_records_status CHECK (
        status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')
    )
);

CREATE INDEX ix_idempotency_records_expires_at
    ON public.idempotency_records (expires_at);

COMMENT ON TABLE public.idempotency_records IS
    'General idempotency records for approved creates and jobs, replayed and expired after seven days.';

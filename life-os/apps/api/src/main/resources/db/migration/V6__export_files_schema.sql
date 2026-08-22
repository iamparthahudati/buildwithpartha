-- LOS-1405: Private generated-file lifecycle schema.
-- Stores metadata, ownership, authorization tokens, and lifecycle status for generated export files.
-- Raw download tokens are never stored; only their hashes reach this database.
-- All records cascade delete when the owning user row is removed.

CREATE TABLE public.export_files (
    id                         UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id                    UUID        NOT NULL,
    job_id                     UUID,
    export_kind                TEXT        NOT NULL,
    file_name                  TEXT        NOT NULL,
    file_size_bytes            BIGINT,
    status                     TEXT        NOT NULL DEFAULT 'GENERATING',
    download_token_hash        TEXT,
    download_token_expires_at  TIMESTAMPTZ,
    expires_at                 TIMESTAMPTZ NOT NULL,
    downloaded_at              TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_export_files         PRIMARY KEY (id),
    CONSTRAINT fk_export_files_user    FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_export_files_job     FOREIGN KEY (job_id)
        REFERENCES public.background_jobs (id) ON DELETE SET NULL,
    CONSTRAINT ck_export_files_kind    CHECK (
        export_kind IN ('FULL_DATA_EXPORT')
    ),
    CONSTRAINT ck_export_files_status  CHECK (
        status IN ('GENERATING', 'READY', 'EXPIRED', 'DELETED')
    ),
    CONSTRAINT ck_export_files_size    CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

CREATE INDEX ix_export_files_user_id
    ON public.export_files (user_id);

-- Supports finding ready/active exports for token verification
CREATE INDEX ix_export_files_token_hash
    ON public.export_files (download_token_hash)
    WHERE download_token_hash IS NOT NULL;

-- Supports R1 retention cleanup:
--   DELETE FROM export_files WHERE status IN ('EXPIRED', 'DELETED')
--     AND updated_at < now() - interval '7 days'
CREATE INDEX ix_export_files_cleanup
    ON public.export_files (updated_at)
    WHERE status IN ('EXPIRED', 'DELETED');

COMMENT ON TABLE  public.export_files IS 'Private generated-file metadata and lifecycle tracking for data exports.';
COMMENT ON COLUMN public.export_files.export_kind IS 'FULL_DATA_EXPORT; selects export structure and format.';
COMMENT ON COLUMN public.export_files.status IS 'GENERATING | READY | EXPIRED | DELETED.';
COMMENT ON COLUMN public.export_files.download_token_hash IS 'SHA-256 hash of the one-time / time-limited download token; raw token is never persisted.';
COMMENT ON COLUMN public.export_files.expires_at IS 'Timestamp when the file itself expires and must be deleted from storage (R1 retention).';
COMMENT ON COLUMN public.export_files.downloaded_at IS 'Recorded when the user downloads the file.';

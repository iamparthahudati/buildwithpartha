-- LOS-0501: Identity schema.
-- Raw tokens are never stored; only their hashes reach this database.
-- All child tables cascade delete when the owning user row is removed.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    email            TEXT        NOT NULL,
    email_normalized TEXT        NOT NULL,
    display_name     TEXT        NOT NULL,
    time_zone        TEXT        NOT NULL,
    locale           TEXT        NOT NULL,
    week_start       SMALLINT    NOT NULL DEFAULT 1,
    account_status   TEXT        NOT NULL DEFAULT 'UNVERIFIED',
    verified_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_email            UNIQUE (email),
    CONSTRAINT uq_users_email_normalized UNIQUE (email_normalized),
    CONSTRAINT ck_users_account_status   CHECK (
        account_status IN ('UNVERIFIED', 'ACTIVE', 'SUSPENDED', 'DELETED')
    ),
    CONSTRAINT ck_users_week_start CHECK (week_start BETWEEN 1 AND 7)
);

COMMENT ON TABLE  public.users                       IS 'One row per LifeOS account.';
COMMENT ON COLUMN public.users.email_normalized      IS 'Lower-cased, NFC-normalized email used for duplicate detection.';
COMMENT ON COLUMN public.users.account_status        IS 'UNVERIFIED | ACTIVE | SUSPENDED | DELETED';
COMMENT ON COLUMN public.users.week_start            IS 'ISO day-of-week: 1 = Monday … 7 = Sunday.';
COMMENT ON COLUMN public.users.version               IS 'Optimistic-lock counter incremented by JPA on every update.';

-- ---------------------------------------------------------------------------
-- credentials  (one per user, one-to-one via UNIQUE(user_id))
-- ---------------------------------------------------------------------------
CREATE TABLE public.credentials (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    password_hash TEXT        NOT NULL,
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_credentials         PRIMARY KEY (id),
    CONSTRAINT uq_credentials_user_id UNIQUE (user_id),
    CONSTRAINT fk_credentials_user    FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

COMMENT ON TABLE  public.credentials               IS 'Password credential for a user. Exactly one row per user.';
COMMENT ON COLUMN public.credentials.password_hash IS 'Argon2id hash produced by LOS-0502; never the raw password.';

-- ---------------------------------------------------------------------------
-- user_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_sessions (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    token_hash   TEXT        NOT NULL,
    csrf_secret  TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    device_hint  TEXT,

    CONSTRAINT pk_user_sessions           PRIMARY KEY (id),
    CONSTRAINT uq_user_sessions_token     UNIQUE (token_hash),
    CONSTRAINT fk_user_sessions_user      FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

-- Efficient lookup by user (e.g. list active sessions).
CREATE INDEX ix_user_sessions_user_id
    ON public.user_sessions (user_id);

-- Supports the cleanup query:
--   DELETE FROM public.user_sessions WHERE expires_at < now() AND revoked_at IS NULL
CREATE INDEX ix_user_sessions_cleanup
    ON public.user_sessions (expires_at)
    WHERE revoked_at IS NULL;

COMMENT ON TABLE  public.user_sessions             IS 'Server-side opaque session. Browser receives only a cookie; the raw token is never persisted.';
COMMENT ON COLUMN public.user_sessions.token_hash  IS 'Hash of the opaque session token stored in the browser cookie.';
COMMENT ON COLUMN public.user_sessions.csrf_secret IS 'CSRF secret bound to this session; never echoed in an API response.';
COMMENT ON COLUMN public.user_sessions.device_hint IS 'Optional opaque device metadata captured at login; structure deferred to LOS-0505.';

-- ---------------------------------------------------------------------------
-- email_verification_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE public.email_verification_tokens (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    token_hash  TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_email_verification_tokens       PRIMARY KEY (id),
    CONSTRAINT uq_email_verification_tokens_hash  UNIQUE (token_hash),
    CONSTRAINT fk_email_verification_tokens_user  FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

-- Lookup all tokens for a user (e.g. check for a recent send before rate-limiting).
CREATE INDEX ix_email_verification_tokens_user_id
    ON public.email_verification_tokens (user_id);

-- Supports the cleanup query:
--   DELETE FROM public.email_verification_tokens WHERE expires_at < now() AND consumed_at IS NULL
CREATE INDEX ix_email_verification_tokens_cleanup
    ON public.email_verification_tokens (expires_at)
    WHERE consumed_at IS NULL;

COMMENT ON TABLE  public.email_verification_tokens            IS 'Single-use hashed token mailed to the user to verify their address.';
COMMENT ON COLUMN public.email_verification_tokens.token_hash IS 'Hash of the URL token; the raw token travels only via email.';

-- ---------------------------------------------------------------------------
-- password_reset_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE public.password_reset_tokens (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    token_hash  TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_password_reset_tokens       PRIMARY KEY (id),
    CONSTRAINT uq_password_reset_tokens_hash  UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user  FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

-- Lookup all reset tokens for a user (e.g. invalidate outstanding tokens on new request).
CREATE INDEX ix_password_reset_tokens_user_id
    ON public.password_reset_tokens (user_id);

-- Supports the cleanup query:
--   DELETE FROM public.password_reset_tokens WHERE expires_at < now() AND consumed_at IS NULL
CREATE INDEX ix_password_reset_tokens_cleanup
    ON public.password_reset_tokens (expires_at)
    WHERE consumed_at IS NULL;

COMMENT ON TABLE  public.password_reset_tokens            IS 'Single-use hashed token mailed to the user to authorize a password reset.';
COMMENT ON COLUMN public.password_reset_tokens.token_hash IS 'Hash of the URL token; the raw token travels only via email.';

-- ---------------------------------------------------------------------------
-- terms_acceptances
-- ---------------------------------------------------------------------------
CREATE TABLE public.terms_acceptances (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    terms_version TEXT        NOT NULL,
    accepted_at   TIMESTAMPTZ NOT NULL,
    ip_source     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_terms_acceptances              PRIMARY KEY (id),
    CONSTRAINT uq_terms_acceptances_user_version UNIQUE (user_id, terms_version),
    CONSTRAINT fk_terms_acceptances_user         FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

-- Lookup all acceptances for a user.
CREATE INDEX ix_terms_acceptances_user_id
    ON public.terms_acceptances (user_id);

COMMENT ON TABLE  public.terms_acceptances               IS 'Audit record of a user accepting a specific version of the Terms of Service.';
COMMENT ON COLUMN public.terms_acceptances.terms_version IS 'Opaque version string identifying the ToS document (e.g. ''2026-08-01'').';
COMMENT ON COLUMN public.terms_acceptances.ip_source     IS 'Source IP captured at acceptance time for audit purposes only; never used for rate-limiting or geolocation.';

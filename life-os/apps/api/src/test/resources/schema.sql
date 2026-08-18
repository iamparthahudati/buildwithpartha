-- H2 schema for the `test` profile (Flyway disabled, spring.jpa.hibernate.ddl-auto=validate).
-- Loosely mirrors V3__outbox_schema.sql's column set (Hibernate's validate mode checks column
-- existence/nullability/type family only, not CHECK constraints or indexes, so this does not need
-- to be a full mirror). Added by LOS-1402 alongside the project's first @Entity; every
-- @SpringBootTest that boots the full context validates every registered entity, not only the ones
-- a given test happens to touch.

CREATE TABLE IF NOT EXISTS outbox_messages (
    id                   UUID                     NOT NULL PRIMARY KEY,
    user_id              UUID,
    message_kind         VARCHAR(64)              NOT NULL,
    recipient_email      VARCHAR(320)              NOT NULL,
    template_variables   TEXT                     NOT NULL,
    status               VARCHAR(32)              NOT NULL,
    attempt_count        INTEGER                  NOT NULL,
    next_attempt_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    last_attempt_at      TIMESTAMP WITH TIME ZONE,
    last_error_class     VARCHAR(512),
    provider_message_id  VARCHAR(255),
    sent_at              TIMESTAMP WITH TIME ZONE,
    dead_lettered_at     TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Added by LOS-0503 alongside the project's first V2__identity_schema.sql-backed entities.
CREATE TABLE IF NOT EXISTS users (
    id                UUID                     NOT NULL PRIMARY KEY,
    email             VARCHAR(254)             NOT NULL,
    email_normalized  VARCHAR(254)             NOT NULL,
    display_name      TEXT                     NOT NULL,
    time_zone         TEXT                     NOT NULL,
    locale            TEXT                     NOT NULL,
    week_start        SMALLINT                 NOT NULL,
    account_status    VARCHAR(32)              NOT NULL,
    verified_at       TIMESTAMP WITH TIME ZONE,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    version           BIGINT                   NOT NULL
);

CREATE TABLE IF NOT EXISTS credentials (
    id             UUID                     NOT NULL PRIMARY KEY,
    user_id        UUID                     NOT NULL,
    password_hash  TEXT                     NOT NULL,
    changed_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS terms_acceptances (
    id             UUID                     NOT NULL PRIMARY KEY,
    user_id        UUID                     NOT NULL,
    terms_version  TEXT                     NOT NULL,
    accepted_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_source      TEXT,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id           UUID                     NOT NULL PRIMARY KEY,
    user_id      UUID                     NOT NULL,
    token_hash   TEXT                     NOT NULL,
    expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at  TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Added by LOS-0505 alongside the project's first Session entity.
CREATE TABLE IF NOT EXISTS user_sessions (
    id            UUID                     NOT NULL PRIMARY KEY,
    user_id       UUID                     NOT NULL,
    token_hash    TEXT                     NOT NULL,
    csrf_secret   TEXT                     NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at    TIMESTAMP WITH TIME ZONE,
    device_hint   TEXT
);

-- Added by LOS-0507 alongside the project's PasswordResetToken entity.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           UUID                     NOT NULL PRIMARY KEY,
    user_id      UUID                     NOT NULL,
    token_hash   TEXT                     NOT NULL,
    expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at  TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL
);

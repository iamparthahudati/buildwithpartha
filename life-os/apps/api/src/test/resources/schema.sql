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

-- Added by LOS-0513 alongside UserPreferencesEntity.
CREATE TABLE IF NOT EXISTS user_preferences (
    id                          UUID                     NOT NULL PRIMARY KEY,
    user_id                     UUID                     NOT NULL,
    onboarding_version          INT                      NOT NULL,
    onboarding_status           VARCHAR(32)              NOT NULL,
    last_completed_step         VARCHAR(32),
    onboarding_completed_at     TIMESTAMP WITH TIME ZONE,
    working_days                INTEGER ARRAY            NOT NULL,
    work_start_time             TIME,
    work_end_time               TIME,
    overnight_schedule          BOOLEAN                  NOT NULL,
    daily_focus_target_minutes  INT,
    focus_duration_minutes      INT                      NOT NULL,
    break_duration_minutes      INT                      NOT NULL,
    long_break_duration_minutes INT                      NOT NULL DEFAULT 15,
    focus_sessions_before_long_break INT                 NOT NULL DEFAULT 4,
    auto_start_breaks           BOOLEAN                  NOT NULL DEFAULT FALSE,
    auto_start_focus_sessions   BOOLEAN                  NOT NULL DEFAULT FALSE,
    sound_enabled               BOOLEAN                  NOT NULL DEFAULT FALSE,
    browser_notifications_enabled BOOLEAN                NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL,
    version                     BIGINT                   NOT NULL
);

-- Added by LOS-1403 alongside BackgroundJobEntity.
CREATE TABLE IF NOT EXISTS background_jobs (
    id                  UUID                     NOT NULL PRIMARY KEY,
    user_id             UUID,
    job_kind            VARCHAR(64)              NOT NULL,
    payload             TEXT                     NOT NULL,
    status              VARCHAR(32)              NOT NULL,
    attempt_count       INTEGER                  NOT NULL,
    next_attempt_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    last_attempt_at     TIMESTAMP WITH TIME ZONE,
    last_error_class    VARCHAR(512),
    started_at          TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    dead_lettered_at    TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Added by LOS-1405 alongside ExportFileEntity.
CREATE TABLE IF NOT EXISTS export_files (
    id                         UUID                     NOT NULL PRIMARY KEY,
    user_id                    UUID                     NOT NULL,
    job_id                     UUID,
    export_kind                VARCHAR(64)              NOT NULL,
    file_name                  TEXT                     NOT NULL,
    file_size_bytes            BIGINT,
    status                     VARCHAR(32)              NOT NULL,
    download_token_hash        TEXT,
    download_token_expires_at  TIMESTAMP WITH TIME ZONE,
    expires_at                 TIMESTAMP WITH TIME ZONE NOT NULL,
    downloaded_at              TIMESTAMP WITH TIME ZONE,
    created_at                 TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at                 TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Added by the LOS-0518 grace-period follow-up alongside AccountDeletionGracePeriodEntity.
CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id                       UUID                     NOT NULL PRIMARY KEY,
    user_id                  UUID                     NOT NULL,
    status                   VARCHAR(32)              NOT NULL,
    cancellation_token_hash  TEXT                     NOT NULL,
    requested_at             TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_purge_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    cancelled_at             TIMESTAMP WITH TIME ZONE,
    purged_at                TIMESTAMP WITH TIME ZONE,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Added by LOS-0701: Labels, projects, project_labels, and milestones.
CREATE TABLE IF NOT EXISTS labels (
    id              UUID                     NOT NULL PRIMARY KEY,
    user_id         UUID                     NOT NULL,
    name            TEXT                     NOT NULL,
    name_normalized TEXT                     NOT NULL,
    color           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    version         BIGINT                   NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id               UUID                     NOT NULL PRIMARY KEY,
    user_id          UUID                     NOT NULL,
    name             TEXT                     NOT NULL,
    description      TEXT,
    status           VARCHAR(32)              NOT NULL,
    priority         VARCHAR(32)              NOT NULL,
    health           VARCHAR(32)              NOT NULL,
    color            TEXT,
    icon             TEXT,
    start_date       DATE,
    deadline_date    DATE,
    estimate_minutes INT,
    archived_at      TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    version          BIGINT                   NOT NULL
);

CREATE TABLE IF NOT EXISTS project_labels (
    project_id UUID NOT NULL,
    label_id   UUID NOT NULL,
    PRIMARY KEY (project_id, label_id)
);

CREATE TABLE IF NOT EXISTS milestones (
    id            UUID                     NOT NULL PRIMARY KEY,
    project_id    UUID                     NOT NULL,
    title         TEXT                     NOT NULL,
    date          DATE,
    status        VARCHAR(32)              NOT NULL,
    ordering      INT                      NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    version       BIGINT                   NOT NULL
);

-- Added by LOS-0801: Tasks and subtasks.
CREATE TABLE IF NOT EXISTS tasks (
    id               UUID                     NOT NULL PRIMARY KEY,
    user_id          UUID                     NOT NULL,
    project_id       UUID,
    title            TEXT                     NOT NULL,
    description      TEXT,
    status           VARCHAR(32)              NOT NULL,
    priority         VARCHAR(32)              NOT NULL,
    due_at           TIMESTAMP WITH TIME ZONE,
    estimate_minutes INT                      NOT NULL,
    spent_minutes    INT                      NOT NULL,
    progress         INT                      NOT NULL,
    mit_date         DATE,
    position         INT                      NOT NULL,
    archived_at      TIMESTAMP WITH TIME ZONE,
    deleted_at       TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    version          BIGINT                   NOT NULL
);

CREATE TABLE IF NOT EXISTS subtasks (
    id         UUID                     NOT NULL PRIMARY KEY,
    task_id    UUID                     NOT NULL,
    title      TEXT                     NOT NULL,
    completed  BOOLEAN                  NOT NULL,
    position   INT                      NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version    BIGINT                   NOT NULL
);

-- Added by LOS-0806: Task labels.
CREATE TABLE IF NOT EXISTS task_labels (
    task_id  UUID NOT NULL,
    label_id UUID NOT NULL,
    PRIMARY KEY (task_id, label_id)
);

-- Added by LOS-0807: Task dependencies.
CREATE TABLE IF NOT EXISTS task_dependencies (
    blocking_task_id UUID                     NOT NULL,
    blocked_task_id  UUID                     NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (blocking_task_id, blocked_task_id)
);

-- Added by LOS-1404: product Activity Events and restricted Security Audit Events.
CREATE TABLE IF NOT EXISTS product_activity_events (
    id             UUID                     NOT NULL PRIMARY KEY,
    user_id        UUID                     NOT NULL,
    actor_user_id  UUID                     NOT NULL,
    event_type     VARCHAR(64)              NOT NULL,
    subject_type   VARCHAR(32)              NOT NULL,
    subject_id     UUID                     NOT NULL,
    object_type    VARCHAR(32)              NOT NULL,
    object_id      UUID                     NOT NULL,
    correlation_id VARCHAR(64)              NOT NULL,
    occurred_at    TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS security_audit_events (
    id              UUID                     NOT NULL PRIMARY KEY,
    event_type      VARCHAR(64)              NOT NULL,
    outcome         VARCHAR(16)              NOT NULL,
    actor_user_id   UUID,
    subject_user_id UUID,
    target_type     VARCHAR(32),
    target_id       UUID,
    correlation_id  VARCHAR(64)              NOT NULL,
    occurred_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Added by LOS-0821: personal Task/Project Comments.
CREATE TABLE IF NOT EXISTS comments (
    id         UUID                     NOT NULL PRIMARY KEY,
    user_id    UUID                     NOT NULL,
    task_id    UUID,
    project_id UUID,
    body       TEXT                     NOT NULL,
    format     VARCHAR(16)              NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    edited_at  TIMESTAMP WITH TIME ZONE,
    version    BIGINT                   NOT NULL
);

-- Added by LOS-0901: Time blocks.
CREATE TABLE IF NOT EXISTS time_blocks (
    id               UUID                     NOT NULL PRIMARY KEY,
    user_id          UUID                     NOT NULL,
    project_id       UUID,
    task_id          UUID,
    title            TEXT                     NOT NULL,
    category         VARCHAR(64)              NOT NULL,
    status           VARCHAR(32)              NOT NULL,
    start_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    source_time_zone TEXT                     NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    version          BIGINT                   NOT NULL
);

-- Added by LOS-0912: Focus Sessions and private interruption events.
CREATE TABLE IF NOT EXISTS focus_sessions (
    id                              UUID                     NOT NULL PRIMARY KEY,
    user_id                         UUID                     NOT NULL,
    task_id                         UUID,
    time_block_id                   UUID,
    status                          VARCHAR(32)              NOT NULL,
    phase                           VARCHAR(32)              NOT NULL,
    planned_focus_duration_seconds BIGINT                   NOT NULL,
    planned_break_duration_seconds BIGINT                   NOT NULL,
    actual_focus_duration_seconds  BIGINT                   NOT NULL,
    actual_break_duration_seconds  BIGINT                   NOT NULL,
    started_at                      TIMESTAMP WITH TIME ZONE NOT NULL,
    phase_started_at                TIMESTAMP WITH TIME ZONE,
    paused_at                       TIMESTAMP WITH TIME ZONE,
    ended_at                        TIMESTAMP WITH TIME ZONE,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL,
    version                         BIGINT                   NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_session_interruptions (
    id               UUID                     NOT NULL PRIMARY KEY,
    focus_session_id UUID                     NOT NULL,
    user_id          UUID                     NOT NULL,
    occurred_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    note             TEXT,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    version          BIGINT                   NOT NULL
);

-- Added by LOS-0913: bounded Focus Session mutation replay keys.
CREATE TABLE IF NOT EXISTS focus_session_operations (
    id               UUID                     NOT NULL PRIMARY KEY,
    user_id          UUID                     NOT NULL,
    idempotency_key  VARCHAR(64)              NOT NULL,
    operation_type   VARCHAR(32)              NOT NULL,
    focus_session_id UUID                     NOT NULL,
    interruption_id  UUID,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_focus_session_operations_user_key UNIQUE (user_id, idempotency_key)
);

-- Added by LOS-1001: Sprints, commitments, retrospective metrics, and immutable events.
CREATE TABLE IF NOT EXISTS sprints (
    id UUID NOT NULL PRIMARY KEY, user_id UUID NOT NULL, name TEXT NOT NULL, goal TEXT,
    start_date DATE NOT NULL, end_date DATE NOT NULL, status VARCHAR(32) NOT NULL,
    target_capacity_points INT NOT NULL, retrospective_notes TEXT, what_went_well TEXT,
    what_could_be_improved TEXT, committed_task_count INT NOT NULL,
    completed_task_count INT NOT NULL, added_task_count INT NOT NULL,
    removed_task_count INT NOT NULL, carried_over_task_count INT NOT NULL,
    total_story_points INT NOT NULL, completed_story_points INT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, version BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sprint_action_items (
    sprint_id UUID NOT NULL, position INT NOT NULL, body TEXT NOT NULL,
    PRIMARY KEY (sprint_id, position)
);

CREATE TABLE IF NOT EXISTS sprint_tasks (
    id UUID NOT NULL PRIMARY KEY, sprint_id UUID NOT NULL, task_id UUID NOT NULL,
    story_points INT NOT NULL, position INT NOT NULL, added_after_start BOOLEAN NOT NULL,
    committed_at TIMESTAMP WITH TIME ZONE NOT NULL, removed_at TIMESTAMP WITH TIME ZONE,
    carried_over_to_sprint_id UUID
);

CREATE TABLE IF NOT EXISTS sprint_events (
    id UUID NOT NULL PRIMARY KEY, sprint_id UUID NOT NULL, event_type VARCHAR(32) NOT NULL,
    task_id UUID, points_delta INT, reason TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Added by LOS-1004: Weekly Plan drafts, revisions, allocations, and snapshots.
CREATE TABLE IF NOT EXISTS weekly_plans (
    id UUID NOT NULL PRIMARY KEY, user_id UUID NOT NULL, week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL, time_zone TEXT NOT NULL, week_start_day INT NOT NULL,
    revision INT NOT NULL, status VARCHAR(32) NOT NULL, predecessor_plan_id UUID,
    finalized_at TIMESTAMP WITH TIME ZONE, snapshot_total_planned_minutes INT,
    snapshot_total_capacity_minutes INT, snapshot_overcapacity_minutes INT,
    snapshot_overcapacity_dates TEXT, snapshot_overlapping_time_block_count INT,
    snapshot_unscheduled_item_count INT, snapshot_outcomes_without_items_count INT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, version BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_plan_capacities (
    id UUID NOT NULL PRIMARY KEY, weekly_plan_id UUID NOT NULL, local_date DATE NOT NULL,
    available_minutes INT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_plan_outcomes (
    id UUID NOT NULL PRIMARY KEY, weekly_plan_id UUID NOT NULL, title TEXT NOT NULL,
    position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_plan_items (
    id UUID NOT NULL PRIMARY KEY, weekly_plan_id UUID NOT NULL, user_id UUID NOT NULL,
    task_id UUID NOT NULL, outcome_id UUID, planned_date DATE, planned_minutes INT NOT NULL,
    position INT NOT NULL, task_title_snapshot TEXT NOT NULL,
    task_status_snapshot VARCHAR(32) NOT NULL
);

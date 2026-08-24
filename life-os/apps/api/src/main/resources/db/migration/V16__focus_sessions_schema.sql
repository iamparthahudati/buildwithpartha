-- LOS-0912: Focus Session schema.
-- Stores server-authoritative focus/break clocks, optional Task/Time Block context,
-- interruption notes, terminal outcomes, and optimistic concurrency versions.

ALTER TABLE public.tasks
    ADD CONSTRAINT uq_tasks_id_user_id UNIQUE (id, user_id);

ALTER TABLE public.time_blocks
    ADD CONSTRAINT uq_time_blocks_id_user_id UNIQUE (id, user_id);

CREATE TABLE public.focus_sessions (
    id                             UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id                        UUID        NOT NULL,
    task_id                        UUID,
    time_block_id                  UUID,
    status                         TEXT        NOT NULL,
    phase                          TEXT        NOT NULL,
    planned_focus_duration_seconds BIGINT      NOT NULL,
    planned_break_duration_seconds BIGINT      NOT NULL,
    actual_focus_duration_seconds  BIGINT      NOT NULL DEFAULT 0,
    actual_break_duration_seconds  BIGINT      NOT NULL DEFAULT 0,
    started_at                     TIMESTAMPTZ NOT NULL,
    phase_started_at               TIMESTAMPTZ,
    paused_at                      TIMESTAMPTZ,
    ended_at                       TIMESTAMPTZ,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                        BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_focus_sessions PRIMARY KEY (id),
    CONSTRAINT uq_focus_sessions_id_user_id UNIQUE (id, user_id),
    CONSTRAINT fk_focus_sessions_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_focus_sessions_task_owner FOREIGN KEY (task_id, user_id)
        REFERENCES public.tasks (id, user_id) ON DELETE SET NULL (task_id),
    CONSTRAINT fk_focus_sessions_time_block_owner FOREIGN KEY (time_block_id, user_id)
        REFERENCES public.time_blocks (id, user_id) ON DELETE SET NULL (time_block_id),
    CONSTRAINT ck_focus_sessions_status CHECK (
        status IN ('RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT ck_focus_sessions_phase CHECK (phase IN ('FOCUS', 'BREAK')),
    CONSTRAINT ck_focus_sessions_planned_focus_positive CHECK (
        planned_focus_duration_seconds > 0
    ),
    CONSTRAINT ck_focus_sessions_durations_non_negative CHECK (
        planned_break_duration_seconds >= 0
        AND actual_focus_duration_seconds >= 0
        AND actual_break_duration_seconds >= 0
    ),
    CONSTRAINT ck_focus_sessions_timestamps_ordered CHECK (
        created_at <= updated_at
        AND started_at >= created_at
        AND (phase_started_at IS NULL OR phase_started_at >= started_at)
        AND (paused_at IS NULL OR paused_at >= started_at)
        AND (ended_at IS NULL OR ended_at >= started_at)
        AND (phase_started_at IS NULL OR updated_at >= phase_started_at)
        AND (paused_at IS NULL OR updated_at >= paused_at)
        AND (ended_at IS NULL OR updated_at >= ended_at)
    ),
    CONSTRAINT ck_focus_sessions_version_non_negative CHECK (version >= 0),
    CONSTRAINT ck_focus_sessions_state_shape CHECK (
        (status = 'RUNNING' AND phase_started_at IS NOT NULL
            AND paused_at IS NULL AND ended_at IS NULL)
        OR (status = 'PAUSED' AND phase_started_at IS NULL
            AND paused_at IS NOT NULL AND ended_at IS NULL)
        OR (status IN ('COMPLETED', 'CANCELLED') AND phase_started_at IS NULL
            AND paused_at IS NULL AND ended_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_focus_sessions_one_active_per_user
    ON public.focus_sessions (user_id)
    WHERE status IN ('RUNNING', 'PAUSED');
CREATE INDEX ix_focus_sessions_user_started_at
    ON public.focus_sessions (user_id, started_at DESC);
CREATE INDEX ix_focus_sessions_user_status
    ON public.focus_sessions (user_id, status);
CREATE INDEX ix_focus_sessions_task_id ON public.focus_sessions (task_id);
CREATE INDEX ix_focus_sessions_time_block_id ON public.focus_sessions (time_block_id);

CREATE TABLE public.focus_session_interruptions (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    focus_session_id UUID        NOT NULL,
    user_id          UUID        NOT NULL,
    occurred_at      TIMESTAMPTZ NOT NULL,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_focus_session_interruptions PRIMARY KEY (id),
    CONSTRAINT fk_focus_session_interruptions_session_owner
        FOREIGN KEY (focus_session_id, user_id)
        REFERENCES public.focus_sessions (id, user_id) ON DELETE CASCADE,
    CONSTRAINT ck_focus_session_interruptions_note CHECK (
        note IS NULL OR (length(btrim(note)) BETWEEN 1 AND 2000)
    ),
    CONSTRAINT ck_focus_session_interruptions_occurred CHECK (
        occurred_at <= created_at
    ),
    CONSTRAINT ck_focus_session_interruptions_version_non_negative CHECK (version >= 0)
);

CREATE INDEX ix_focus_session_interruptions_session_occurred
    ON public.focus_session_interruptions (focus_session_id, occurred_at);
CREATE INDEX ix_focus_session_interruptions_user_occurred
    ON public.focus_session_interruptions (user_id, occurred_at DESC);

COMMENT ON TABLE public.focus_sessions IS
    'User-owned server-authoritative Focus Sessions with focus/break phase timing.';
COMMENT ON COLUMN public.focus_sessions.status IS
    'RUNNING | PAUSED | COMPLETED | CANCELLED';
COMMENT ON COLUMN public.focus_sessions.phase IS 'FOCUS | BREAK';
COMMENT ON COLUMN public.focus_sessions.phase_started_at IS
    'Server clock anchor for the currently running phase; null while paused or terminal.';
COMMENT ON TABLE public.focus_session_interruptions IS
    'Private interruption events optionally carrying a short plain-text distraction note.';

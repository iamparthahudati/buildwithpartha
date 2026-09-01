-- LOS-1305: Recurring task series, occurrences link, and exception records schema.
-- Models timezone-aware task recurrence definitions (daily, weekly, monthly, weekday, interval, after completion),
-- end modes (never, until date, count), occurrence exception records (skipped, rescheduled, deleted, overridden),
-- and links task occurrences to their parent recurring task series.

-- ---------------------------------------------------------------------------
-- recurring_task_series
-- ---------------------------------------------------------------------------
CREATE TABLE public.recurring_task_series (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL,
    title            TEXT        NOT NULL,
    description      TEXT,
    status           TEXT        NOT NULL DEFAULT 'TO_DO',
    priority         TEXT        NOT NULL DEFAULT 'P2',
    project_id       UUID,
    estimate_minutes INT         NOT NULL DEFAULT 0,
    frequency        TEXT        NOT NULL,
    interval_value   INT         NOT NULL DEFAULT 1,
    days_of_week     TEXT,
    day_of_month     INT,
    end_mode         TEXT        NOT NULL DEFAULT 'NEVER',
    end_date         DATE,
    end_count        INT,
    start_date       DATE        NOT NULL,
    time_zone        TEXT        NOT NULL,
    archived_at      TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_recurring_task_series PRIMARY KEY (id),
    CONSTRAINT fk_recurring_task_series_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_recurring_task_series_project FOREIGN KEY (project_id)
        REFERENCES public.projects (id) ON DELETE SET NULL,
    CONSTRAINT ck_recurring_task_series_title CHECK (
        char_length(btrim(title)) > 0
    ),
    CONSTRAINT ck_recurring_task_series_status CHECK (
        status IN ('TO_DO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED')
    ),
    CONSTRAINT ck_recurring_task_series_priority CHECK (
        priority IN ('P1', 'P2', 'P3', 'P4')
    ),
    CONSTRAINT ck_recurring_task_series_frequency CHECK (
        frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAY', 'INTERVAL', 'AFTER_COMPLETION')
    ),
    CONSTRAINT ck_recurring_task_series_end_mode CHECK (
        end_mode IN ('NEVER', 'UNTIL_DATE', 'COUNT')
    ),
    CONSTRAINT ck_recurring_task_series_interval CHECK (
        interval_value > 0
    ),
    CONSTRAINT ck_recurring_task_series_estimate CHECK (
        estimate_minutes >= 0
    ),
    CONSTRAINT ck_recurring_task_series_time_zone CHECK (
        char_length(btrim(time_zone)) > 0
    )
);

CREATE INDEX ix_recurring_task_series_user ON public.recurring_task_series (user_id);
CREATE INDEX ix_recurring_task_series_project ON public.recurring_task_series (project_id);

COMMENT ON TABLE  public.recurring_task_series                  IS 'Timezone-aware recurring task series definitions (LOS-1305).';
COMMENT ON COLUMN public.recurring_task_series.user_id          IS 'Owner of the recurring task series.';
COMMENT ON COLUMN public.recurring_task_series.frequency        IS 'DAILY | WEEKLY | MONTHLY | WEEKDAY | INTERVAL | AFTER_COMPLETION';
COMMENT ON COLUMN public.recurring_task_series.end_mode         IS 'NEVER | UNTIL_DATE | COUNT';

-- ---------------------------------------------------------------------------
-- recurring_task_exceptions
-- ---------------------------------------------------------------------------
CREATE TABLE public.recurring_task_exceptions (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    series_id        UUID        NOT NULL,
    user_id          UUID        NOT NULL,
    occurrence_date  DATE        NOT NULL,
    exception_type   TEXT        NOT NULL,
    rescheduled_date DATE,
    override_task_id UUID,
    reason           TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_recurring_task_exceptions PRIMARY KEY (id),
    CONSTRAINT fk_recurring_task_exceptions_series FOREIGN KEY (series_id)
        REFERENCES public.recurring_task_series (id) ON DELETE CASCADE,
    CONSTRAINT fk_recurring_task_exceptions_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_recurring_task_exceptions_override FOREIGN KEY (override_task_id)
        REFERENCES public.tasks (id) ON DELETE SET NULL,
    CONSTRAINT uq_recurring_task_exceptions_series_date UNIQUE (series_id, occurrence_date),
    CONSTRAINT ck_recurring_task_exceptions_type CHECK (
        exception_type IN ('SKIPPED', 'RESCHEDULED', 'DELETED', 'OVERRIDDEN')
    )
);

CREATE INDEX ix_recurring_task_exceptions_series ON public.recurring_task_exceptions (series_id);
CREATE INDEX ix_recurring_task_exceptions_user ON public.recurring_task_exceptions (user_id);

COMMENT ON TABLE public.recurring_task_exceptions IS 'Per-occurrence exceptions for recurring series (LOS-1305).';

-- ---------------------------------------------------------------------------
-- tasks recurrence link columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
    ADD COLUMN recurring_series_id UUID REFERENCES public.recurring_task_series (id) ON DELETE SET NULL,
    ADD COLUMN recurrence_occurrence_date DATE;

CREATE INDEX ix_tasks_recurring_series ON public.tasks (recurring_series_id);

COMMENT ON COLUMN public.tasks.recurring_series_id IS 'Optional parent recurring task series definition.';
COMMENT ON COLUMN public.tasks.recurrence_occurrence_date IS 'Optional original occurrence date for recurring task occurrences.';

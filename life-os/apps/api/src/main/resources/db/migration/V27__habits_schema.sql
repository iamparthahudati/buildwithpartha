-- LOS-1208: Habits, habit entries, and habit pause periods schema.
-- Models user-owned habits with a cadence, per-period target count, an IANA timezone for
-- timezone-safe streak bucketing, optional reminder preference, pause periods, and dated
-- completion entries. Entries are keyed by the habit's local calendar date so streak
-- calculations stay deterministic across timezone changes.

CREATE TABLE public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cadence_type TEXT NOT NULL DEFAULT 'DAILY',
    target_count INT NOT NULL DEFAULT 1,
    time_zone TEXT NOT NULL,
    color TEXT,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_time TIME,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_habits_name_not_blank CHECK (char_length(btrim(name)) > 0),
    CONSTRAINT ck_habits_time_zone_not_blank CHECK (char_length(btrim(time_zone)) > 0),
    CONSTRAINT ck_habits_target_count_positive CHECK (target_count > 0),
    CONSTRAINT ck_habits_cadence_type CHECK (
        cadence_type IN ('DAILY', 'WEEKLY', 'MONTHLY')
    ),
    CONSTRAINT ck_habits_reminder_time CHECK (
        reminder_enabled = FALSE OR reminder_time IS NOT NULL
    )
);

CREATE INDEX ix_habits_user ON public.habits(user_id);
CREATE INDEX ix_habits_user_archived ON public.habits(user_id, archived);

CREATE TABLE public.habit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    completed_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT uq_habit_entries_habit_local_date UNIQUE (habit_id, local_date),
    CONSTRAINT ck_habit_entries_completed_count_positive CHECK (completed_count > 0)
);

CREATE INDEX ix_habit_entries_habit ON public.habit_entries(habit_id);
CREATE INDEX ix_habit_entries_user ON public.habit_entries(user_id);
CREATE INDEX ix_habit_entries_habit_date ON public.habit_entries(habit_id, local_date);

CREATE TABLE public.habit_pause_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_habit_pause_periods_date_order CHECK (
        end_date IS NULL OR end_date >= start_date
    )
);

CREATE INDEX ix_habit_pause_periods_habit ON public.habit_pause_periods(habit_id);
CREATE INDEX ix_habit_pause_periods_user ON public.habit_pause_periods(user_id);

COMMENT ON TABLE public.habits IS
    'Habits with cadence, per-period target count, IANA timezone, reminder preference, and archive state (LOS-1208).';
COMMENT ON TABLE public.habit_entries IS
    'Dated habit completion entries, unique per habit per local calendar date (LOS-1208).';
COMMENT ON TABLE public.habit_pause_periods IS
    'Date ranges during which a habit is paused and excluded from streak eligibility (LOS-1208).';

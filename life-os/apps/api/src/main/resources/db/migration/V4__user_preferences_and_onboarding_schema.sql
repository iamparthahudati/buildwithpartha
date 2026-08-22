-- LOS-0513: User preferences and onboarding schema.
-- Stores onboarding progress, versioning, confirmed timezone/locale/week-start, and planning defaults.
-- Cascades on user deletion.

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_preferences (
    id                          UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id                     UUID        NOT NULL,
    onboarding_version          INT         NOT NULL DEFAULT 1,
    onboarding_status           TEXT        NOT NULL DEFAULT 'NOT_STARTED',
    last_completed_step         TEXT,
    onboarding_completed_at     TIMESTAMPTZ,
    working_days                INT[]       NOT NULL DEFAULT '{1,2,3,4,5}',
    work_start_time             TIME WITHOUT TIME ZONE,
    work_end_time               TIME WITHOUT TIME ZONE,
    overnight_schedule          BOOLEAN     NOT NULL DEFAULT FALSE,
    daily_focus_target_minutes  INT,
    focus_duration_minutes      INT         NOT NULL DEFAULT 25,
    break_duration_minutes      INT         NOT NULL DEFAULT 5,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                     BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_user_preferences PRIMARY KEY (id),
    CONSTRAINT uq_user_preferences_user_id UNIQUE (user_id),
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT ck_user_preferences_onboarding_status CHECK (
        onboarding_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')
    ),
    CONSTRAINT ck_user_preferences_last_completed_step CHECK (
        last_completed_step IS NULL OR last_completed_step IN ('WELCOME', 'TIME_AND_WEEK', 'PLANNING_DEFAULTS', 'START')
    ),
    CONSTRAINT ck_user_preferences_daily_focus_target CHECK (
        daily_focus_target_minutes IS NULL OR (daily_focus_target_minutes > 0 AND daily_focus_target_minutes <= 1440)
    ),
    CONSTRAINT ck_user_preferences_focus_duration CHECK (
        focus_duration_minutes > 0 AND focus_duration_minutes <= 1440
    ),
    CONSTRAINT ck_user_preferences_break_duration CHECK (
        break_duration_minutes > 0 AND break_duration_minutes <= 1440
    )
);

CREATE INDEX ix_user_preferences_user_id
    ON public.user_preferences (user_id);

COMMENT ON TABLE  public.user_preferences                            IS 'User preferences, planning defaults, and onboarding state.';
COMMENT ON COLUMN public.user_preferences.user_id                    IS 'Foreign key referencing the owning user account.';
COMMENT ON COLUMN public.user_preferences.onboarding_version         IS 'Onboarding specification version completed or in progress.';
COMMENT ON COLUMN public.user_preferences.onboarding_status          IS 'NOT_STARTED | IN_PROGRESS | COMPLETED';
COMMENT ON COLUMN public.user_preferences.last_completed_step        IS 'WELCOME | TIME_AND_WEEK | PLANNING_DEFAULTS | START';
COMMENT ON COLUMN public.user_preferences.working_days               IS 'ISO days of week (1 = Monday ... 7 = Sunday) designated as working days.';
COMMENT ON COLUMN public.user_preferences.work_start_time            IS 'Typical local work day start time (optional).';
COMMENT ON COLUMN public.user_preferences.work_end_time              IS 'Typical local work day end time (optional).';
COMMENT ON COLUMN public.user_preferences.overnight_schedule         IS 'True if work hours span across midnight into the next day.';
COMMENT ON COLUMN public.user_preferences.daily_focus_target_minutes IS 'Optional daily focus target in minutes.';
COMMENT ON COLUMN public.user_preferences.focus_duration_minutes     IS 'Default focus block duration in minutes (default 25).';
COMMENT ON COLUMN public.user_preferences.break_duration_minutes     IS 'Default break duration in minutes (default 5).';
COMMENT ON COLUMN public.user_preferences.version                    IS 'Optimistic-lock counter incremented by JPA on every update.';

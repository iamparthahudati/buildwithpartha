-- LOS-0916: Persist safe per-account Focus Mode cycle and notification preferences.

ALTER TABLE public.user_preferences
    ADD COLUMN long_break_duration_minutes       INT     NOT NULL DEFAULT 15,
    ADD COLUMN focus_sessions_before_long_break  INT     NOT NULL DEFAULT 4,
    ADD COLUMN auto_start_breaks                  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN auto_start_focus_sessions          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN sound_enabled                      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN browser_notifications_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT ck_user_preferences_long_break_duration
        CHECK (long_break_duration_minutes > 0 AND long_break_duration_minutes <= 180),
    ADD CONSTRAINT ck_user_preferences_focus_sessions_before_long_break
        CHECK (focus_sessions_before_long_break > 0 AND focus_sessions_before_long_break <= 12);

COMMENT ON COLUMN public.user_preferences.long_break_duration_minutes
    IS 'Long break duration in minutes after the configured number of completed Focus Sessions.';
COMMENT ON COLUMN public.user_preferences.focus_sessions_before_long_break
    IS 'Completed Focus Sessions per cycle before the long break is offered.';
COMMENT ON COLUMN public.user_preferences.auto_start_breaks
    IS 'Whether the next break may start automatically after focus ends.';
COMMENT ON COLUMN public.user_preferences.auto_start_focus_sessions
    IS 'Whether the next Focus Session may start automatically after a break ends.';
COMMENT ON COLUMN public.user_preferences.sound_enabled
    IS 'Whether this account prefers a local phase-change sound when supported.';
COMMENT ON COLUMN public.user_preferences.browser_notifications_enabled
    IS 'Whether this account prefers browser phase-change notifications when permission is granted.';

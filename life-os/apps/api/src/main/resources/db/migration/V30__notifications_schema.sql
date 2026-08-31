-- LOS-1303: Notifications and Notification Preferences Schema
-- Models in-app notifications and user-level notification preferences (category toggles, quiet hours, channel preferences).
-- Enforces per-user ownership, read/unread state timestamps, source URL deep links, clearable flags, and optimistic concurrency versioning.

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_url TEXT,
    read_at TIMESTAMPTZ,
    is_clearable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_notifications_title_not_blank CHECK (char_length(btrim(title)) > 0),
    CONSTRAINT ck_notifications_body_not_blank CHECK (char_length(btrim(body)) > 0),
    CONSTRAINT ck_notifications_category CHECK (
        category IN (
            'DUE_REMINDER',
            'OVERDUE',
            'TIME_BLOCK',
            'FOCUS',
            'HABIT',
            'REVIEW',
            'SECURITY',
            'SYSTEM'
        )
    )
);

CREATE INDEX ix_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX ix_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX ix_notifications_user_category ON public.notifications(user_id, category);

CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
    quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
    due_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    overdue_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    time_block_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    focus_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    habit_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    review_prompts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    security_notices_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    system_notices_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_channel_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_channel_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_channel_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT uq_notification_preferences_user UNIQUE (user_id),
    CONSTRAINT ck_notification_preferences_quiet_start CHECK (quiet_hours_start ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$'),
    CONSTRAINT ck_notification_preferences_quiet_end CHECK (quiet_hours_end ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$')
);

CREATE INDEX ix_notification_preferences_user ON public.notification_preferences(user_id);

COMMENT ON TABLE public.notifications IS
    'In-app notifications with category, title, body, source URL, read timestamp, and clearable flag (LOS-1303).';
COMMENT ON TABLE public.notification_preferences IS
    'Per-user notification settings covering quiet hours, category toggles, and channel preferences (LOS-1303).';

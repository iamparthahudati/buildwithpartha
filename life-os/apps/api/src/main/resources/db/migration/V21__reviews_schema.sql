-- LOS-1009: Daily, weekly, and monthly review schema, answers, item decisions, and snapshot metrics.

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL,
    period_key TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    time_zone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    skip_reason TEXT,
    finalized_at TIMESTAMPTZ,
    snapshot_tasks_completed_count INT,
    snapshot_tasks_planned_count INT,
    snapshot_tasks_carried_over_count INT,
    snapshot_tasks_cancelled_count INT,
    snapshot_tasks_overdue_count INT,
    snapshot_planned_focus_minutes INT,
    snapshot_actual_focus_minutes INT,
    snapshot_sprint_committed_count INT,
    snapshot_sprint_completed_count INT,
    snapshot_active_project_count INT,
    snapshot_completed_project_count INT,
    snapshot_stalled_project_count INT,
    snapshot_daily_review_completion_count INT,
    snapshot_has_missing_data BOOLEAN,
    snapshot_missing_data_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_reviews_user_type_period
        UNIQUE (user_id, review_type, period_key),
    CONSTRAINT ck_reviews_review_type
        CHECK (review_type IN ('DAILY_MORNING', 'DAILY_EVENING', 'WEEKLY', 'MONTHLY')),
    CONSTRAINT ck_reviews_status
        CHECK (status IN ('DRAFT', 'FINALIZED', 'SKIPPED')),
    CONSTRAINT ck_reviews_skip_reason
        CHECK (status <> 'SKIPPED' OR (skip_reason IS NOT NULL AND char_length(btrim(skip_reason)) > 0)),
    CONSTRAINT ck_reviews_z_finalization CHECK (
        (status = 'DRAFT' AND finalized_at IS NULL AND snapshot_has_missing_data IS NULL)
        OR
        (status = 'SKIPPED' AND finalized_at IS NULL)
        OR
        (status = 'FINALIZED' AND finalized_at IS NOT NULL AND snapshot_has_missing_data IS NOT NULL)
    )
);

CREATE INDEX ix_reviews_user_period
    ON public.reviews(user_id, review_type, period_key);

CREATE TABLE public.review_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    prompt_key TEXT NOT NULL,
    answer_value TEXT NOT NULL,
    CONSTRAINT uq_review_answers_review_prompt UNIQUE (review_id, prompt_key),
    CONSTRAINT ck_review_answers_prompt_key CHECK (char_length(btrim(prompt_key)) BETWEEN 1 AND 100)
);

CREATE INDEX ix_review_answers_review
    ON public.review_answers(review_id);

CREATE TABLE public.review_item_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_date DATE,
    notes TEXT,
    CONSTRAINT uq_review_item_decisions_review_item UNIQUE (review_id, item_type, item_id),
    CONSTRAINT ck_review_item_decisions_item_type CHECK (item_type IN ('TASK', 'PROJECT', 'GOAL')),
    CONSTRAINT ck_review_item_decisions_action CHECK (
        action IN ('KEEP_FOR_TOMORROW', 'RESCHEDULE', 'RETURN_TO_BACKLOG', 'MARK_BLOCKED', 'COMPLETE', 'CANCEL', 'CONTINUE', 'PAUSE', 'ARCHIVE')
    )
);

CREATE INDEX ix_review_item_decisions_review
    ON public.review_item_decisions(review_id);

COMMENT ON TABLE public.reviews IS
    'Daily, weekly, and monthly review sessions with status, period bounds, and frozen snapshot metrics (LOS-1009).';
COMMENT ON TABLE public.review_answers IS
    'User structured and freeform text answers mapped to specific review prompt keys (LOS-1009).';
COMMENT ON TABLE public.review_item_decisions IS
    'Explicit carry-over, rescheduling, and project/goal status decisions made during review sessions (LOS-1009).';

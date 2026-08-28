-- LOS-1004: timezone-aware Weekly Plan drafts, revisions, allocations, and final snapshots.
ALTER TABLE public.tasks ADD CONSTRAINT uq_tasks_user_id_id UNIQUE (user_id, id);

CREATE TABLE public.weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    time_zone TEXT NOT NULL,
    week_start_day INT NOT NULL,
    revision INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    predecessor_plan_id UUID REFERENCES public.weekly_plans(id) ON DELETE RESTRICT,
    finalized_at TIMESTAMPTZ,
    snapshot_total_planned_minutes INT,
    snapshot_total_capacity_minutes INT,
    snapshot_overcapacity_minutes INT,
    snapshot_overcapacity_dates TEXT,
    snapshot_overlapping_time_block_count INT,
    snapshot_unscheduled_item_count INT,
    snapshot_outcomes_without_items_count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_weekly_plans_user_week_revision
        UNIQUE (user_id, week_start_date, revision),
    CONSTRAINT ck_weekly_plans_week
        CHECK (week_end_date = week_start_date + 6),
    CONSTRAINT ck_weekly_plans_week_start_day CHECK (week_start_day BETWEEN 1 AND 7),
    CONSTRAINT ck_weekly_plans_revision CHECK (revision > 0),
    CONSTRAINT ck_weekly_plans_status CHECK (status IN ('DRAFT', 'FINALIZED')),
    CONSTRAINT ck_weekly_plans_finalization CHECK (
        (status = 'DRAFT' AND finalized_at IS NULL
            AND snapshot_total_planned_minutes IS NULL
            AND snapshot_total_capacity_minutes IS NULL
            AND snapshot_overcapacity_minutes IS NULL
            AND snapshot_overlapping_time_block_count IS NULL
            AND snapshot_unscheduled_item_count IS NULL
            AND snapshot_outcomes_without_items_count IS NULL)
        OR
        (status = 'FINALIZED' AND finalized_at IS NOT NULL
            AND snapshot_total_planned_minutes >= 0
            AND snapshot_total_capacity_minutes >= 0
            AND snapshot_overcapacity_minutes >= 0
            AND snapshot_overlapping_time_block_count >= 0
            AND snapshot_unscheduled_item_count >= 0
            AND snapshot_outcomes_without_items_count >= 0)
    )
);
CREATE UNIQUE INDEX uq_weekly_plans_one_draft_per_week
    ON public.weekly_plans(user_id, week_start_date) WHERE status = 'DRAFT';
CREATE INDEX ix_weekly_plans_user_week
    ON public.weekly_plans(user_id, week_start_date DESC, revision DESC);

CREATE TABLE public.weekly_plan_capacities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    available_minutes INT NOT NULL,
    CONSTRAINT uq_weekly_plan_capacities_date UNIQUE (weekly_plan_id, local_date),
    CONSTRAINT ck_weekly_plan_capacities_minutes
        CHECK (available_minutes BETWEEN 0 AND 1440)
);

CREATE TABLE public.weekly_plan_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_weekly_plan_outcomes_plan_id UNIQUE (weekly_plan_id, id),
    CONSTRAINT ck_weekly_plan_outcomes_title CHECK (char_length(btrim(title)) BETWEEN 1 AND 200)
);
CREATE INDEX ix_weekly_plan_outcomes_order
    ON public.weekly_plan_outcomes(weekly_plan_id, position, id);

CREATE TABLE public.weekly_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    outcome_id UUID,
    planned_date DATE,
    planned_minutes INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0,
    task_title_snapshot TEXT NOT NULL,
    task_status_snapshot TEXT NOT NULL,
    CONSTRAINT uq_weekly_plan_items_task UNIQUE (weekly_plan_id, task_id),
    CONSTRAINT fk_weekly_plan_items_owned_task FOREIGN KEY (user_id, task_id)
        REFERENCES public.tasks(user_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_weekly_plan_items_outcome FOREIGN KEY (weekly_plan_id, outcome_id)
        REFERENCES public.weekly_plan_outcomes(weekly_plan_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_weekly_plan_items_minutes CHECK (planned_minutes BETWEEN 0 AND 1440),
    CONSTRAINT ck_weekly_plan_items_task_status CHECK (
        task_status_snapshot IN ('TO_DO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'))
);
CREATE INDEX ix_weekly_plan_items_order
    ON public.weekly_plan_items(weekly_plan_id, planned_date, position, id);
CREATE INDEX ix_weekly_plan_items_task ON public.weekly_plan_items(task_id);

COMMENT ON TABLE public.weekly_plans IS
    'User-owned Weekly Plan drafts and immutable finalized revisions.';
COMMENT ON COLUMN public.weekly_plans.time_zone IS
    'IANA timezone snapshot defining this planning week and its conflict boundaries.';
COMMENT ON COLUMN public.weekly_plans.week_start_day IS
    'ISO day-of-week snapshot, 1 Monday through 7 Sunday.';
COMMENT ON TABLE public.weekly_plan_capacities IS
    'Seven local-date capacity decisions for one Weekly Plan revision.';
COMMENT ON TABLE public.weekly_plan_outcomes IS
    'User-authored outcome statements for one Weekly Plan revision.';
COMMENT ON TABLE public.weekly_plan_items IS
    'Task allocations with optional local date and finalized Task label/status snapshots.';

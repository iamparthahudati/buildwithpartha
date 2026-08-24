-- LOS-1001: user-owned Sprint lifecycle, commitments, and immutable history.
CREATE TABLE public.sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    target_capacity_points INT NOT NULL DEFAULT 0,
    retrospective_notes TEXT,
    what_went_well TEXT,
    what_could_be_improved TEXT,
    committed_task_count INT NOT NULL DEFAULT 0,
    completed_task_count INT NOT NULL DEFAULT 0,
    added_task_count INT NOT NULL DEFAULT 0,
    removed_task_count INT NOT NULL DEFAULT 0,
    carried_over_task_count INT NOT NULL DEFAULT 0,
    total_story_points INT NOT NULL DEFAULT 0,
    completed_story_points INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_sprints_status CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
    CONSTRAINT ck_sprints_dates CHECK (end_date >= start_date),
    CONSTRAINT ck_sprints_capacity CHECK (target_capacity_points >= 0),
    CONSTRAINT ck_sprints_metrics CHECK (
      committed_task_count >= 0 AND completed_task_count >= 0 AND added_task_count >= 0
      AND removed_task_count >= 0 AND carried_over_task_count >= 0
      AND total_story_points >= 0 AND completed_story_points >= 0)
);
CREATE INDEX ix_sprints_user_dates ON public.sprints(user_id, start_date, end_date);
CREATE INDEX ix_sprints_user_status ON public.sprints(user_id, status);
CREATE UNIQUE INDEX uq_sprints_one_active_per_user ON public.sprints(user_id)
  WHERE status = 'ACTIVE';

CREATE TABLE public.sprint_action_items (
    sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    position INT NOT NULL,
    body TEXT NOT NULL,
    PRIMARY KEY (sprint_id, position)
);

CREATE TABLE public.sprint_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
    story_points INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0,
    added_after_start BOOLEAN NOT NULL DEFAULT false,
    committed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at TIMESTAMPTZ,
    carried_over_to_sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
    CONSTRAINT ck_sprint_tasks_points CHECK (story_points >= 0),
    CONSTRAINT uq_sprint_tasks_sprint_task UNIQUE (sprint_id, task_id)
);
CREATE INDEX ix_sprint_tasks_task ON public.sprint_tasks(task_id);

CREATE TABLE public.sprint_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    task_id UUID,
    points_delta INT,
    reason TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_sprint_events_type CHECK (event_type IN (
      'CREATED','UPDATED','GOAL_CHANGED','CAPACITY_CHANGED','STARTED','TASK_ADDED',
      'TASK_REMOVED','POINTS_CHANGED','COMPLETED','CANCELLED','CARRIED_OVER'))
);
CREATE INDEX ix_sprint_events_sprint_time ON public.sprint_events(sprint_id, occurred_at, id);

COMMENT ON TABLE public.sprints IS 'User-owned bounded personal commitment windows.';
COMMENT ON TABLE public.sprint_tasks IS 'Sprint task commitments retained after removal for scope history.';
COMMENT ON TABLE public.sprint_events IS 'Immutable Sprint lifecycle, goal, capacity, and scope events.';

-- LOS-0807: Task dependencies schema.
-- Models directed dependency relationship between tasks (blocking task -> blocked task).
-- Cascades deletion when either task is deleted.

-- ---------------------------------------------------------------------------
-- task_dependencies
-- ---------------------------------------------------------------------------
CREATE TABLE public.task_dependencies (
    blocking_task_id UUID        NOT NULL,
    blocked_task_id  UUID        NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_task_dependencies PRIMARY KEY (blocking_task_id, blocked_task_id),
    CONSTRAINT fk_task_dependencies_blocking FOREIGN KEY (blocking_task_id)
        REFERENCES public.tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_dependencies_blocked FOREIGN KEY (blocked_task_id)
        REFERENCES public.tasks (id) ON DELETE CASCADE,
    CONSTRAINT ck_task_dependencies_no_self CHECK (blocking_task_id <> blocked_task_id)
);

CREATE INDEX ix_task_dependencies_blocked_task_id ON public.task_dependencies (blocked_task_id);
CREATE INDEX ix_task_dependencies_blocking_task_id ON public.task_dependencies (blocking_task_id);

COMMENT ON TABLE  public.task_dependencies                  IS 'Directed dependency edges linking blocking tasks to blocked tasks.';
COMMENT ON COLUMN public.task_dependencies.blocking_task_id IS 'ID of the task that blocks execution.';
COMMENT ON COLUMN public.task_dependencies.blocked_task_id  IS 'ID of the task that is blocked.';
COMMENT ON COLUMN public.task_dependencies.created_at       IS 'Timestamp when dependency edge was created.';

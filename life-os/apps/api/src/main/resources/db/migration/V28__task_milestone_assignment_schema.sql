-- LOS-0826: Link tasks to milestones.
-- Isolated assignment table (one milestone per task) rather than a column on tasks,
-- to avoid rippling the Task aggregate. Deleting a task or its milestone clears the link.

CREATE TABLE public.task_milestones (
    task_id      UUID        NOT NULL,
    user_id      UUID        NOT NULL,
    milestone_id UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    version      BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_task_milestones PRIMARY KEY (task_id),
    CONSTRAINT fk_task_milestones_task FOREIGN KEY (task_id)
        REFERENCES public.tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_milestones_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_milestones_milestone FOREIGN KEY (milestone_id)
        REFERENCES public.milestones (id) ON DELETE CASCADE
);

CREATE INDEX ix_task_milestones_milestone_id ON public.task_milestones (milestone_id);
CREATE INDEX ix_task_milestones_user_id ON public.task_milestones (user_id);

COMMENT ON TABLE  public.task_milestones              IS 'Assigns a task to at most one project milestone (LOS-0826).';
COMMENT ON COLUMN public.task_milestones.task_id      IS 'The assigned task; primary key enforces one milestone per task.';
COMMENT ON COLUMN public.task_milestones.user_id      IS 'Owner of the task and milestone.';
COMMENT ON COLUMN public.task_milestones.milestone_id IS 'The milestone the task belongs to; must share the task project.';

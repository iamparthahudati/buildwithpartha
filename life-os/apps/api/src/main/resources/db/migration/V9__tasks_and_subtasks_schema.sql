-- LOS-0801: Tasks and subtasks schema.
-- Models user-owned tasks and subtasks with constraints, indexes, and partial MIT unique index.
-- Cascades deletion when the owning user or parent task is deleted; sets project_id to NULL when project is deleted.

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.tasks (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL,
    project_id       UUID,
    title            TEXT        NOT NULL,
    description      TEXT,
    status           TEXT        NOT NULL DEFAULT 'TO_DO',
    priority         TEXT        NOT NULL DEFAULT 'P2',
    due_at           TIMESTAMPTZ,
    estimate_minutes INT         NOT NULL DEFAULT 0,
    spent_minutes    INT         NOT NULL DEFAULT 0,
    progress         INT         NOT NULL DEFAULT 0,
    mit_date         DATE,
    position         INT         NOT NULL DEFAULT 0,
    archived_at      TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_tasks PRIMARY KEY (id),
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
        REFERENCES public.projects (id) ON DELETE SET NULL,
    CONSTRAINT ck_tasks_status CHECK (
        status IN ('TO_DO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED')
    ),
    CONSTRAINT ck_tasks_priority CHECK (
        priority IN ('P1', 'P2', 'P3', 'P4')
    ),
    CONSTRAINT ck_tasks_estimates CHECK (
        estimate_minutes >= 0 AND spent_minutes >= 0
    ),
    CONSTRAINT ck_tasks_progress CHECK (
        progress >= 0 AND progress <= 100
    )
);

CREATE INDEX ix_tasks_user_id ON public.tasks (user_id);
CREATE INDEX ix_tasks_project_id ON public.tasks (project_id);
CREATE INDEX ix_tasks_user_status ON public.tasks (user_id, status);
CREATE INDEX ix_tasks_user_due_at ON public.tasks (user_id, due_at);

-- One active MIT per user per local date
CREATE UNIQUE INDEX uq_tasks_user_mit_date ON public.tasks (user_id, mit_date)
    WHERE mit_date IS NOT NULL AND deleted_at IS NULL;

COMMENT ON TABLE  public.tasks                  IS 'User-owned tasks representing actions.';
COMMENT ON COLUMN public.tasks.user_id          IS 'Owner of the task.';
COMMENT ON COLUMN public.tasks.project_id       IS 'Optional project to which this task belongs.';
COMMENT ON COLUMN public.tasks.status           IS 'TO_DO | IN_PROGRESS | BLOCKED | DONE | CANCELLED';
COMMENT ON COLUMN public.tasks.priority         IS 'P1 | P2 | P3 | P4';
COMMENT ON COLUMN public.tasks.due_at           IS 'Optional due date/time.';
COMMENT ON COLUMN public.tasks.estimate_minutes IS 'Expected duration in minutes.';
COMMENT ON COLUMN public.tasks.spent_minutes    IS 'Recorded time spent in minutes.';
COMMENT ON COLUMN public.tasks.progress         IS 'Completion progress percentage (0-100).';
COMMENT ON COLUMN public.tasks.mit_date         IS 'Optional local date when this task is designated as Most Important Task.';
COMMENT ON COLUMN public.tasks.archived_at      IS 'Timestamp when the task was archived; null if active.';
COMMENT ON COLUMN public.tasks.deleted_at       IS 'Timestamp when the task was soft-deleted; null if active.';

-- ---------------------------------------------------------------------------
-- subtasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.subtasks (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    task_id    UUID        NOT NULL,
    title      TEXT        NOT NULL,
    completed  BOOLEAN     NOT NULL DEFAULT false,
    position   INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version    BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_subtasks PRIMARY KEY (id),
    CONSTRAINT fk_subtasks_task FOREIGN KEY (task_id)
        REFERENCES public.tasks (id) ON DELETE CASCADE
);

CREATE INDEX ix_subtasks_task_id ON public.subtasks (task_id);

COMMENT ON TABLE  public.subtasks         IS 'Checklist items belonging to a parent task.';
COMMENT ON COLUMN public.subtasks.task_id IS 'Parent task to which this subtask belongs.';
COMMENT ON COLUMN public.subtasks.completed IS 'Whether the subtask is completed.';

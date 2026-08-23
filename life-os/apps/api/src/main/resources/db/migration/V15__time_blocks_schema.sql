-- LOS-0901: Time blocks schema.
-- Models user-owned time blocks with ownership, category, status, optional project/task links, start/end instants, source timezone, and optimistic concurrency versioning.
-- Cascades deletion when owning user is deleted; sets project_id or task_id to NULL when linked project or task is deleted.

CREATE TABLE public.time_blocks (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL,
    project_id       UUID,
    task_id          UUID,
    title            TEXT        NOT NULL,
    category         TEXT        NOT NULL DEFAULT 'GENERAL',
    status           TEXT        NOT NULL DEFAULT 'SCHEDULED',
    start_at         TIMESTAMPTZ NOT NULL,
    end_at           TIMESTAMPTZ NOT NULL,
    source_time_zone TEXT        NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_time_blocks PRIMARY KEY (id),
    CONSTRAINT fk_time_blocks_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_time_blocks_project FOREIGN KEY (project_id)
        REFERENCES public.projects (id) ON DELETE SET NULL,
    CONSTRAINT fk_time_blocks_task FOREIGN KEY (task_id)
        REFERENCES public.tasks (id) ON DELETE SET NULL,
    CONSTRAINT ck_time_blocks_status CHECK (
        status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT ck_time_blocks_end_after_start CHECK (
        end_at > start_at
    )
);

CREATE INDEX ix_time_blocks_user_id ON public.time_blocks (user_id);
CREATE INDEX ix_time_blocks_user_start_end ON public.time_blocks (user_id, start_at, end_at);
CREATE INDEX ix_time_blocks_user_status ON public.time_blocks (user_id, status);
CREATE INDEX ix_time_blocks_project_id ON public.time_blocks (project_id);
CREATE INDEX ix_time_blocks_task_id ON public.time_blocks (task_id);

COMMENT ON TABLE  public.time_blocks                  IS 'User-owned time blocks representing scheduled time intervals.';
COMMENT ON COLUMN public.time_blocks.user_id          IS 'Owner of the time block.';
COMMENT ON COLUMN public.time_blocks.project_id       IS 'Optional project linked to this time block.';
COMMENT ON COLUMN public.time_blocks.task_id          IS 'Optional task linked to this time block.';
COMMENT ON COLUMN public.time_blocks.title            IS 'Display title of the time block.';
COMMENT ON COLUMN public.time_blocks.category         IS 'Fixed category name or code.';
COMMENT ON COLUMN public.time_blocks.status           IS 'SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED';
COMMENT ON COLUMN public.time_blocks.start_at         IS 'UTC start instant of the time block.';
COMMENT ON COLUMN public.time_blocks.end_at           IS 'UTC end instant of the time block.';
COMMENT ON COLUMN public.time_blocks.source_time_zone IS 'IANA timezone ID in which the time block was scheduled.';
COMMENT ON COLUMN public.time_blocks.notes            IS 'Optional user notes or description for the time block.';

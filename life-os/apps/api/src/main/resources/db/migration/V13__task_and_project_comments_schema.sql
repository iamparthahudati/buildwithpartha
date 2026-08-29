-- LOS-0821: personal Task/Project comments with optimistic concurrency and strict ownership.

ALTER TABLE public.tasks
    ADD CONSTRAINT uq_tasks_id_user UNIQUE (id, user_id);

ALTER TABLE public.projects
    ADD CONSTRAINT uq_projects_id_user UNIQUE (id, user_id);

CREATE TABLE public.comments (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL,
    task_id    UUID,
    project_id UUID,
    body       TEXT        NOT NULL,
    format     VARCHAR(16) NOT NULL DEFAULT 'PLAIN_TEXT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at  TIMESTAMPTZ,
    version    BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_comments PRIMARY KEY (id),
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_task_owner FOREIGN KEY (task_id, user_id)
        REFERENCES public.tasks (id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_project_owner FOREIGN KEY (project_id, user_id)
        REFERENCES public.projects (id, user_id) ON DELETE CASCADE,
    CONSTRAINT ck_comments_one_parent CHECK (
        (task_id IS NOT NULL AND project_id IS NULL)
        OR (task_id IS NULL AND project_id IS NOT NULL)
    ),
    CONSTRAINT ck_comments_format CHECK (format IN ('PLAIN_TEXT', 'MARKDOWN')),
    CONSTRAINT ck_comments_body_length CHECK (char_length(body) BETWEEN 1 AND 20000),
    CONSTRAINT ck_comments_edited_at CHECK (edited_at IS NULL OR edited_at >= created_at)
);

CREATE INDEX ix_comments_task_page
    ON public.comments (user_id, task_id, created_at DESC, id DESC)
    WHERE task_id IS NOT NULL;

CREATE INDEX ix_comments_project_page
    ON public.comments (user_id, project_id, created_at DESC, id DESC)
    WHERE project_id IS NOT NULL;

COMMENT ON TABLE public.comments IS
    'Personal Account-owned Comments attached to exactly one Task or Project.';
COMMENT ON COLUMN public.comments.body IS
    'Plain text or sanitized Markdown; raw HTML, images, and unsafe links are not retained.';

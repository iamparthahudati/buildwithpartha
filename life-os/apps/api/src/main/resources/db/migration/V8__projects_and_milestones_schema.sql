-- LOS-0701: Projects and milestones schema.
-- Models user-defined labels, projects, project label associations, and milestones.
-- Cascades deletion when the owning user/project is deleted.

-- ---------------------------------------------------------------------------
-- labels
-- ---------------------------------------------------------------------------
CREATE TABLE public.labels (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    name            TEXT        NOT NULL,
    name_normalized TEXT        NOT NULL,
    color           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    version         BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_labels PRIMARY KEY (id),
    CONSTRAINT fk_labels_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT uq_labels_user_name_normalized UNIQUE (user_id, name_normalized)
);

CREATE INDEX ix_labels_user_id ON public.labels (user_id);

COMMENT ON TABLE  public.labels                 IS 'User-defined labels for categorizing items.';
COMMENT ON COLUMN public.labels.user_id         IS 'Owner of the label.';
COMMENT ON COLUMN public.labels.name            IS 'Display name of the label, preserving user casing.';
COMMENT ON COLUMN public.labels.name_normalized IS 'Normalized name for duplicate checking.';

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL,
    name             TEXT        NOT NULL,
    description      TEXT,
    status           TEXT        NOT NULL DEFAULT 'PLANNED',
    priority         TEXT        NOT NULL DEFAULT 'P2',
    health           TEXT        NOT NULL DEFAULT 'NOT_SET',
    color            TEXT,
    icon             TEXT,
    start_date       DATE,
    deadline_date    DATE,
    estimate_minutes INT,
    archived_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_projects PRIMARY KEY (id),
    CONSTRAINT fk_projects_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT ck_projects_status CHECK (
        status IN ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT ck_projects_priority CHECK (
        priority IN ('P1', 'P2', 'P3', 'P4')
    ),
    CONSTRAINT ck_projects_health CHECK (
        health IN ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'NOT_SET')
    ),
    CONSTRAINT ck_projects_deadline CHECK (
        start_date IS NULL OR deadline_date IS NULL OR deadline_date >= start_date
    )
);

CREATE INDEX ix_projects_user_id ON public.projects (user_id);

COMMENT ON TABLE  public.projects                  IS 'User-owned projects representing outcomes.';
COMMENT ON COLUMN public.projects.user_id          IS 'Owner of the project.';
COMMENT ON COLUMN public.projects.status           IS 'PLANNED | ACTIVE | ON_HOLD | COMPLETED | CANCELLED';
COMMENT ON COLUMN public.projects.priority         IS 'P1 | P2 | P3 | P4';
COMMENT ON COLUMN public.projects.health           IS 'ON_TRACK | AT_RISK | OFF_TRACK | NOT_SET';
COMMENT ON COLUMN public.projects.start_date       IS 'Optional project start date.';
COMMENT ON COLUMN public.projects.deadline_date    IS 'Optional project deadline date.';
COMMENT ON COLUMN public.projects.estimate_minutes IS 'Expected effort duration in minutes.';
COMMENT ON COLUMN public.projects.archived_at      IS 'Timestamp when the project was archived; null if active.';

-- ---------------------------------------------------------------------------
-- project_labels
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_labels (
    project_id UUID NOT NULL,
    label_id   UUID NOT NULL,

    CONSTRAINT pk_project_labels PRIMARY KEY (project_id, label_id),
    CONSTRAINT fk_project_labels_project FOREIGN KEY (project_id)
        REFERENCES public.projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_labels_label FOREIGN KEY (label_id)
        REFERENCES public.labels (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_labels_label_id ON public.project_labels (label_id);

COMMENT ON TABLE  public.project_labels            IS 'Many-to-many relationship linking projects and labels.';
COMMENT ON COLUMN public.project_labels.project_id IS 'ID of the project.';
COMMENT ON COLUMN public.project_labels.label_id   IS 'ID of the label.';

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
CREATE TABLE public.milestones (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    project_id    UUID        NOT NULL,
    title         TEXT        NOT NULL,
    date          DATE,
    status        TEXT        NOT NULL DEFAULT 'PLANNED',
    ordering      INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    version       BIGINT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_milestones PRIMARY KEY (id),
    CONSTRAINT fk_milestones_project FOREIGN KEY (project_id)
        REFERENCES public.projects (id) ON DELETE CASCADE,
    CONSTRAINT ck_milestones_status CHECK (
        status IN ('PLANNED', 'COMPLETED', 'CANCELLED')
    )
);

CREATE INDEX ix_milestones_project_id ON public.milestones (project_id);

COMMENT ON TABLE  public.milestones            IS 'Dated checkpoints belonging to a project.';
COMMENT ON COLUMN public.milestones.project_id IS 'Project to which this milestone belongs.';
COMMENT ON COLUMN public.milestones.status     IS 'PLANNED | COMPLETED | CANCELLED';

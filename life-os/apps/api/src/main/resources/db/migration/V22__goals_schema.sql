-- LOS-1101: Goals, goal check-ins, and goal links schema.
-- Models user-owned goals with progress type, target/current progress values, status, cadence, check-ins, and target links.

CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    progress_type TEXT NOT NULL,
    target_value NUMERIC(19, 4),
    current_value NUMERIC(19, 4) NOT NULL DEFAULT 0,
    unit TEXT,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    check_in_cadence TEXT NOT NULL DEFAULT 'NONE',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_goals_title_not_blank CHECK (char_length(btrim(title)) > 0),
    CONSTRAINT ck_goals_category_not_blank CHECK (char_length(btrim(category)) > 0),
    CONSTRAINT ck_goals_progress_type CHECK (
        progress_type IN ('PERCENTAGE', 'NUMERIC', 'MILESTONE', 'BINARY')
    ),
    CONSTRAINT ck_goals_status CHECK (
        status IN ('NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT ck_goals_check_in_cadence CHECK (
        check_in_cadence IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'NONE')
    ),
    CONSTRAINT ck_goals_current_value_non_negative CHECK (current_value >= 0),
    CONSTRAINT ck_goals_target_value_positive CHECK (target_value IS NULL OR target_value > 0)
);

CREATE INDEX ix_goals_user ON public.goals(user_id);
CREATE INDEX ix_goals_user_status ON public.goals(user_id, status);
CREATE INDEX ix_goals_user_category ON public.goals(user_id, category);
CREATE INDEX ix_goals_user_archived ON public.goals(user_id, archived);

CREATE TABLE public.goal_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    value NUMERIC(19, 4) NOT NULL,
    note TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_goal_check_ins_value_non_negative CHECK (value >= 0)
);

CREATE INDEX ix_goal_check_ins_goal ON public.goal_check_ins(goal_id);
CREATE INDEX ix_goal_check_ins_user ON public.goal_check_ins(user_id);
CREATE INDEX ix_goal_check_ins_goal_recorded ON public.goal_check_ins(goal_id, recorded_at);

CREATE TABLE public.goal_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_goal_links_goal_target UNIQUE (goal_id, target_type, target_id),
    CONSTRAINT ck_goal_links_target_type CHECK (
        target_type IN ('PROJECT', 'TASK', 'HABIT')
    )
);

CREATE INDEX ix_goal_links_goal ON public.goal_links(goal_id);
CREATE INDEX ix_goal_links_user ON public.goal_links(user_id);
CREATE INDEX ix_goal_links_target ON public.goal_links(target_type, target_id);

COMMENT ON TABLE public.goals IS
    'Goals defining long-term outcomes, progress types, target/current progress, status, and check-in cadence (LOS-1101).';
COMMENT ON TABLE public.goal_check_ins IS
    'Dated progress updates recorded for goals (LOS-1101).';
COMMENT ON TABLE public.goal_links IS
    'Links connecting goals to related projects, tasks, or habits (LOS-1101).';

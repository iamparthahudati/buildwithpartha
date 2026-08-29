-- LOS-1204: Brain Dump Items schema.
-- Models user-owned brain dump items with content, status, target conversion details, and archived_at.

CREATE TABLE public.brain_dump_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPROCESSED',
    converted_to_type TEXT,
    converted_to_id UUID,
    converted_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_brain_dump_items_content_not_blank CHECK (char_length(btrim(content)) > 0),
    CONSTRAINT ck_brain_dump_items_status CHECK (status IN ('UNPROCESSED', 'DEFERRED', 'CONVERTED')),
    CONSTRAINT ck_brain_dump_items_converted_to_type CHECK (converted_to_type IN ('TASK', 'NOTE', 'PROJECT', 'GOAL')),
    CONSTRAINT ck_brain_dump_items_conversion_consistency CHECK (
        (status = 'CONVERTED' AND converted_to_type IS NOT NULL AND converted_to_id IS NOT NULL AND converted_at IS NOT NULL) OR
        (status != 'CONVERTED' AND converted_to_type IS NULL AND converted_to_id IS NULL AND converted_at IS NULL)
    )
);

CREATE INDEX ix_brain_dump_items_user_status ON public.brain_dump_items(user_id, status);
CREATE INDEX ix_brain_dump_items_user_archived ON public.brain_dump_items(user_id, archived_at);
CREATE INDEX ix_brain_dump_items_user_created_at ON public.brain_dump_items(user_id, created_at);
CREATE INDEX ix_brain_dump_items_converted ON public.brain_dump_items(converted_to_type, converted_to_id);

COMMENT ON TABLE public.brain_dump_items IS
    'Brain Dump Items containing quickly captured thoughts awaiting triage or conversion (LOS-1204).';

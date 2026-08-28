-- LOS-1201: Notes, note labels, and note links schema.
-- Models user-owned notes with plain/Markdown body, pinned, archived, labels and links.

CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_notes_title_not_blank CHECK (char_length(btrim(title)) > 0)
);

CREATE INDEX ix_notes_user ON public.notes(user_id);
CREATE INDEX ix_notes_user_pinned ON public.notes(user_id, pinned);
CREATE INDEX ix_notes_user_archived ON public.notes(user_id, archived);

CREATE TABLE public.note_labels (
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,

    CONSTRAINT pk_note_labels PRIMARY KEY (note_id, label_id)
);

CREATE INDEX ix_note_labels_label_id ON public.note_labels(label_id);

CREATE TABLE public.note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_note_links_note_target UNIQUE (note_id, target_type, target_id),
    CONSTRAINT ck_note_links_target_type CHECK (
        target_type IN ('PROJECT', 'TASK', 'GOAL')
    )
);

CREATE INDEX ix_note_links_note ON public.note_links(note_id);
CREATE INDEX ix_note_links_user ON public.note_links(user_id);
CREATE INDEX ix_note_links_target ON public.note_links(target_type, target_id);

COMMENT ON TABLE public.notes IS
    'Notes containing text/Markdown with title, pinned, archived, and label mappings (LOS-1201).';
COMMENT ON TABLE public.note_labels IS
    'Many-to-many relationship mapping notes to labels (LOS-1201).';
COMMENT ON TABLE public.note_links IS
    'Links connecting notes to related projects, tasks, or goals (LOS-1201).';

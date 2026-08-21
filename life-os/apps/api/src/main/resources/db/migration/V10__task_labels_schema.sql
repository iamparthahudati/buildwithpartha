-- LOS-0806: Task labels join table schema.
-- Models many-to-many relationship linking tasks and labels.
-- Cascades deletion when either the task or the label is deleted.

-- ---------------------------------------------------------------------------
-- task_labels
-- ---------------------------------------------------------------------------
CREATE TABLE public.task_labels (
    task_id  UUID NOT NULL,
    label_id UUID NOT NULL,

    CONSTRAINT pk_task_labels PRIMARY KEY (task_id, label_id),
    CONSTRAINT fk_task_labels_task FOREIGN KEY (task_id)
        REFERENCES public.tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_labels_label FOREIGN KEY (label_id)
        REFERENCES public.labels (id) ON DELETE CASCADE
);

CREATE INDEX ix_task_labels_label_id ON public.task_labels (label_id);

COMMENT ON TABLE  public.task_labels          IS 'Many-to-many relationship linking tasks and labels.';
COMMENT ON COLUMN public.task_labels.task_id  IS 'ID of the task.';
COMMENT ON COLUMN public.task_labels.label_id IS 'ID of the label.';

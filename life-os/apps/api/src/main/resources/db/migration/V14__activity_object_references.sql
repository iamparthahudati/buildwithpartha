-- LOS-0823: keep feed ownership separate from the current linkable object.

ALTER TABLE public.product_activity_events
    ADD COLUMN object_type VARCHAR(32),
    ADD COLUMN object_id UUID;

UPDATE public.product_activity_events
SET object_type = subject_type,
    object_id = subject_id;

ALTER TABLE public.product_activity_events
    ALTER COLUMN object_type SET NOT NULL,
    ALTER COLUMN object_id SET NOT NULL,
    ADD CONSTRAINT ck_product_activity_object_type
        CHECK (object_type IN ('PROJECT', 'TASK'));

CREATE INDEX ix_product_activity_object
    ON public.product_activity_events (user_id, object_type, object_id, occurred_at DESC, id DESC);

COMMENT ON COLUMN public.product_activity_events.object_id IS
    'Content-free UUID resolved through current owner-scoped state; no title or body snapshot.';

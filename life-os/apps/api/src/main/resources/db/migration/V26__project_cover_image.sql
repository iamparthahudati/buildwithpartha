-- LOS: Add an optional back-cover image reference to projects.
-- Stores an absolute https URL or a root-relative app path (e.g. /life-os/project-covers/x.jpg),
-- not binary image data. Length-bounded to keep rows and API payloads small.

ALTER TABLE public.projects
    ADD COLUMN cover_image_url TEXT;

ALTER TABLE public.projects
    ADD CONSTRAINT ck_projects_cover_image_url_length
    CHECK (cover_image_url IS NULL OR char_length(cover_image_url) <= 2048);

-- LOS-1413: Database query tuning and index optimization.
-- Adds measured composite indexes on core application domain tables for lists, search, dashboards, and reports.

CREATE INDEX IF NOT EXISTS ix_tasks_user_project_status ON public.tasks (user_id, project_id, status);
CREATE INDEX IF NOT EXISTS ix_tasks_user_updated ON public.tasks (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_tasks_user_archived ON public.tasks (user_id, archived_at);

CREATE INDEX IF NOT EXISTS ix_projects_user_updated ON public.projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_projects_user_archived ON public.projects (user_id, archived_at);

CREATE INDEX IF NOT EXISTS ix_notes_user_updated ON public.notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_notes_user_pinned_updated ON public.notes (user_id, pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS ix_habit_entries_user_date ON public.habit_entries (user_id, local_date);

CREATE INDEX IF NOT EXISTS ix_time_blocks_user_status_start ON public.time_blocks (user_id, status, start_at);

-- LOS-1301: User-scoped global search indexes.
-- Adds indexes on target search tables to support user-scoped text searches.

CREATE INDEX IF NOT EXISTS ix_projects_user_search ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS ix_tasks_user_search ON public.tasks (user_id, deleted_at);
CREATE INDEX IF NOT EXISTS ix_notes_user_search ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS ix_brain_dump_user_search ON public.brain_dump_items (user_id);
CREATE INDEX IF NOT EXISTS ix_goals_user_search ON public.goals (user_id);
CREATE INDEX IF NOT EXISTS ix_habits_user_search ON public.habits (user_id);

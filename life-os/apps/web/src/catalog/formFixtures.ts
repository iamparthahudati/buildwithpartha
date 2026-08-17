/** Priority options used by the form-control catalog entries. */
export const PRIORITY_OPTIONS = [
  { value: "P1", label: "P1 — High" },
  { value: "P2", label: "P2 — Medium", description: "Normal planned importance." },
  { value: "P3", label: "P3 — Low" },
  { value: "P4", label: "P4 — Someday", disabled: true },
];

/** Canonical Task status values with their UI labels (LOS-0111 vocabulary). */
export const TASK_STATUS_OPTIONS = [
  { value: "TO_DO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];

/** Neutral, original project names for the Select specimens. */
export const PROJECT_OPTIONS = [
  { value: "portfolio-refresh", label: "Portfolio refresh" },
  { value: "home-records-cleanup", label: "Home records cleanup" },
  { value: "learning-plan", label: "Learning plan" },
  { value: "archived-plan", label: "Archived plan", disabled: true },
];

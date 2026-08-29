/**
 * Conversion form contracts and field defaults for the Brain Dump conversion
 * workflow (LOS-1206).
 *
 * The backend convert endpoints (LOS-1204) require a populated destination
 * payload — a task needs a priority, a note needs a body, a goal needs a
 * category/progress type/cadence — plus the item `version` for optimistic
 * concurrency. These helpers derive sensible defaults from the captured text
 * so the conversion dialog opens pre-filled ("destination preview/fields")
 * while keeping every required field honest.
 */
import type {
  ConvertToGoalRequestDto,
  ConvertToNoteRequestDto,
  ConvertToProjectRequestDto,
  ConvertToTaskRequestDto,
} from "../api/brainDumpApi";
import type { BrainDumpConvertTargetType } from "./brainDumpItem";

export interface SelectChoice {
  readonly value: string;
  readonly label: string;
}

export const TASK_PRIORITY_OPTIONS: readonly SelectChoice[] = [
  { value: "P1", label: "P1 — Highest" },
  { value: "P2", label: "P2 — High" },
  { value: "P3", label: "P3 — Medium" },
  { value: "P4", label: "P4 — Low" },
];

export const PROJECT_PRIORITY_OPTIONS = TASK_PRIORITY_OPTIONS;

export const GOAL_CATEGORY_OPTIONS: readonly SelectChoice[] = [
  { value: "PERSONAL", label: "Personal" },
  { value: "WORK", label: "Work" },
  { value: "HEALTH", label: "Health & Fitness" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "LEARNING", label: "Learning" },
  { value: "CAREER", label: "Career" },
];

export const GOAL_PROGRESS_TYPE_OPTIONS: readonly SelectChoice[] = [
  { value: "PERCENTAGE", label: "Percentage (0 – 100%)" },
  { value: "NUMERIC", label: "Numeric target" },
  { value: "MILESTONE", label: "Milestone target" },
  { value: "BINARY", label: "Binary (done / not done)" },
];

export const GOAL_CADENCE_OPTIONS: readonly SelectChoice[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "MANUAL", label: "Manual" },
];

export const DEFAULT_TASK_PRIORITY = "P3";
export const DEFAULT_PROJECT_PRIORITY = "P3";
export const DEFAULT_GOAL_CATEGORY = "PERSONAL";
export const DEFAULT_GOAL_PROGRESS_TYPE = "BINARY";
export const DEFAULT_GOAL_CADENCE = "WEEKLY";

/** Backend `@Size(max = 500)` on every convert title/name field. */
export const CONVERT_TITLE_MAX = 500;

/**
 * Derives a title/name from captured text: the first non-empty line, trimmed
 * and capped to the backend title limit. Keeps the original text intact — the
 * source item is always preserved.
 */
export function deriveConvertTitle(content: string): string {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const base = firstLine ?? content.trim();
  return base.slice(0, CONVERT_TITLE_MAX);
}

/** Editable fields backing the conversion dialog form (LOS-1206). */
export interface ConvertFormFields {
  readonly title: string;
  readonly description: string;
  readonly body: string;
  readonly priority: string;
  readonly category: string;
  readonly progressType: string;
  readonly checkInCadence: string;
}

export function initialConvertFields(content: string): ConvertFormFields {
  const title = deriveConvertTitle(content);
  return {
    title,
    description: "",
    body: content,
    priority: DEFAULT_TASK_PRIORITY,
    category: DEFAULT_GOAL_CATEGORY,
    progressType: DEFAULT_GOAL_PROGRESS_TYPE,
    checkInCadence: DEFAULT_GOAL_CADENCE,
  };
}

/**
 * Builds the destination-specific request payload from the form fields and the
 * item version. Optional empty strings are dropped so the backend receives
 * absent fields rather than blank ones.
 */
export function buildConvertRequest(
  target: "TASK",
  fields: ConvertFormFields,
  version: number,
): ConvertToTaskRequestDto;
export function buildConvertRequest(
  target: "NOTE",
  fields: ConvertFormFields,
  version: number,
): ConvertToNoteRequestDto;
export function buildConvertRequest(
  target: "PROJECT",
  fields: ConvertFormFields,
  version: number,
): ConvertToProjectRequestDto;
export function buildConvertRequest(
  target: "GOAL",
  fields: ConvertFormFields,
  version: number,
): ConvertToGoalRequestDto;
export function buildConvertRequest(
  target: BrainDumpConvertTargetType,
  fields: ConvertFormFields,
  version: number,
):
  | ConvertToTaskRequestDto
  | ConvertToNoteRequestDto
  | ConvertToProjectRequestDto
  | ConvertToGoalRequestDto {
  const title = fields.title.trim();
  const description = fields.description.trim();
  switch (target) {
    case "TASK":
      return {
        title,
        priority: fields.priority,
        version,
        ...(description ? { description } : {}),
      };
    case "NOTE":
      return {
        title,
        body: fields.body.trim() || fields.title.trim(),
        version,
      };
    case "PROJECT":
      return {
        name: title,
        priority: fields.priority,
        version,
        ...(description ? { description } : {}),
      };
    case "GOAL":
      return {
        title,
        category: fields.category,
        progressType: fields.progressType,
        checkInCadence: fields.checkInCadence,
        version,
        ...(description ? { description } : {}),
      };
    default: {
      const exhaustive: never = target;
      throw new Error(`Unsupported conversion target: ${String(exhaustive)}`);
    }
  }
}

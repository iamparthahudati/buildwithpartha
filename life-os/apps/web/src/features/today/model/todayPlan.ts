export type TodayPlanTaskPriority = "P1" | "P2" | "P3" | "P4";

export type TodayPlanTaskStatus = "TO_DO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type TodayPlanTaskAction = "set-mit" | "mark-done" | "start-focus";

export interface TodayPlanProjectContext {
  readonly name: string;
  readonly href?: string;
}

/**
 * A compact Task projection for the Today plan. It deliberately contains no
 * second copy of Task state: LOS-0615 maps the canonical Today response into
 * this display contract, while later Task tickets continue to own mutation
 * and persistence behavior.
 */
export interface TodayPlanTask {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly priority: TodayPlanTaskPriority;
  readonly status: TodayPlanTaskStatus;
  readonly project?: TodayPlanProjectContext;
  /** Already localized by the caller, for example "Due today, 20 Aug 2026". */
  readonly dueLabel?: string;
  readonly isMit?: boolean;
  readonly pendingAction?: TodayPlanTaskAction;
  readonly disabledActions?: readonly TodayPlanTaskAction[];
}

export type TodayMitState =
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "ready"; readonly task: TodayPlanTask };

export type TodayTaskListState =
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "ready"; readonly tasks: readonly TodayPlanTask[] };

export const TODAY_PLAN_PRIORITY_LABEL: Readonly<Record<TodayPlanTaskPriority, string>> =
  Object.freeze({
    P1: "P1 — High",
    P2: "P2 — Medium",
    P3: "P3 — Low",
    P4: "P4 — Someday",
  });

export const TODAY_PLAN_STATUS_LABEL: Readonly<Record<TodayPlanTaskStatus, string>> = Object.freeze(
  {
    TO_DO: "To Do",
    IN_PROGRESS: "In progress",
    BLOCKED: "Blocked",
    DONE: "Done",
  },
);

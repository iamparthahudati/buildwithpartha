import { describe, expect, it } from "vitest";

import { MOCK_TASKS } from "./mockTasks";
import {
  applyBulkToTasks,
  applyTasksViewTab,
  countTaskSummary,
  describeBulkError,
  filterTasks,
  paginateTasks,
  readTasksViewTab,
  sortTasks,
} from "./taskScreen";

const NOW = new Date("2026-08-21T12:00:00Z");

describe("task screen helpers", () => {
  it("counts non-archived summary metrics including overdue", () => {
    const counts = countTaskSummary(MOCK_TASKS, NOW);

    expect(counts.total).toBe(9);
    expect(counts.toDo).toBe(4);
    expect(counts.inProgress).toBe(2);
    expect(counts.blocked).toBe(1);
    expect(counts.done).toBe(1);
    expect(counts.overdue).toBe(1);
  });

  it("filters by tab, search, priority and project", () => {
    const blocked = filterTasks(
      MOCK_TASKS,
      { tab: "BLOCKED", search: "", priority: "ALL", projectId: "ALL" },
      NOW,
    );
    expect(blocked.map((task) => task.id)).toEqual(["task-launch-checklist"]);

    const overdue = filterTasks(
      MOCK_TASKS,
      { tab: "OVERDUE", search: "", priority: "ALL", projectId: "ALL" },
      NOW,
    );
    expect(overdue.map((task) => task.id)).toEqual(["task-privacy-notice"]);

    const archived = filterTasks(
      MOCK_TASKS,
      { tab: "ARCHIVED", search: "", priority: "ALL", projectId: "ALL" },
      NOW,
    );
    expect(archived.map((task) => task.id)).toEqual(["task-archived-onboarding"]);

    const searched = filterTasks(
      MOCK_TASKS,
      { tab: "ALL", search: "privacy", priority: "ALL", projectId: "ALL" },
      NOW,
    );
    expect(searched.map((task) => task.id)).toEqual(["task-privacy-notice"]);

    const noProject = filterTasks(
      MOCK_TASKS,
      { tab: "ALL", search: "", priority: "ALL", projectId: "NONE" },
      NOW,
    );
    expect(noProject.map((task) => task.id)).toEqual(["task-inbox-capture"]);
  });

  it("sorts with a stable id tie-breaker", () => {
    const byTitle = sortTasks(MOCK_TASKS, { optionId: "title", direction: "asc" });
    expect(byTitle[0]?.title).toBe("Draft privacy notice");
  });

  it("paginates from a 1-based page", () => {
    const page = paginateTasks(MOCK_TASKS, 2, 3);
    expect(page).toHaveLength(3);
    expect(page[0]?.id).toBe(MOCK_TASKS[3]?.id);
  });

  it("applies bulk actions and keeps failed selections", () => {
    const selected = new Set(["task-weekly-review", "task-home-bills"]);
    const { tasks, outcome } = applyBulkToTasks(
      MOCK_TASKS,
      selected,
      { type: "ARCHIVE" },
      {
        nowIso: "2026-08-21T13:00:00Z",
        projects: [],
        failIds: new Set(["task-weekly-review"]),
      },
    );

    expect(outcome).toEqual({
      requested: 2,
      succeeded: 1,
      failed: [
        {
          taskId: "task-weekly-review",
          title: "Prepare weekly review",
          errorCode: "CONCURRENCY_CONFLICT",
        },
      ],
    });
    expect(tasks.find((task) => task.id === "task-home-bills")?.archivedAt).toBe(
      "2026-08-21T13:00:00Z",
    );
    expect(tasks.find((task) => task.id === "task-weekly-review")?.archivedAt).toBeNull();
  });

  it("round-trips view tabs through URL keys without mutating the source", () => {
    const current = new URLSearchParams("q=review&projectId=project-1&page=3");
    const archived = applyTasksViewTab(current, "ARCHIVED");

    expect(archived.get("archived")).toBe("true");
    expect(archived.get("q")).toBe("review");
    expect(archived.has("page")).toBe(false);
    expect(current.get("page")).toBe("3");
    expect(readTasksViewTab(archived)).toBe("ARCHIVED");
    expect(readTasksViewTab(applyTasksViewTab(current, "TO_DO"))).toBe("TO_DO");
  });

  it("names known bulk error codes honestly", () => {
    expect(describeBulkError("CONCURRENCY_CONFLICT")).toBe(
      "This task changed. Reload and try again.",
    );
    expect(describeBulkError("UNKNOWN")).toBe("We couldn't update this task. Try again.");
  });
});

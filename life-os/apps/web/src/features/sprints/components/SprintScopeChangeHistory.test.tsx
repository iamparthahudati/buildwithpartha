import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SprintScopeChangeHistory } from "./SprintScopeChangeHistory";
import type { SprintScopeChangeEvent } from "../model/sprint";

const MOCK_EVENTS: readonly SprintScopeChangeEvent[] = [
  {
    id: "evt-1",
    sprintId: "sprint-1",
    changeType: "TASK_ADDED",
    taskId: "task-9",
    taskTitle: "Hotfix critical login bug",
    pointsDelta: 3,
    reason: "Urgent issue reported by user",
    timestamp: "2026-08-18 10:30",
  },
  {
    id: "evt-2",
    sprintId: "sprint-1",
    changeType: "TASK_REMOVED",
    taskId: "task-3",
    taskTitle: "Optional documentation page",
    pointsDelta: -2,
    reason: "Deprioritized for next sprint",
    timestamp: "2026-08-19 14:15",
  },
];

describe("SprintScopeChangeHistory", () => {
  it("renders scope change events timeline", async () => {
    const { container } = render(<SprintScopeChangeHistory events={MOCK_EVENTS} />);

    expect(screen.getByText("Scope Change History (2)")).toBeInTheDocument();
    expect(screen.getByText("+ Task Added")).toBeInTheDocument();
    expect(screen.getByText("Hotfix critical login bug")).toBeInTheDocument();
    expect(screen.getByText("Impact: +3 pts")).toBeInTheDocument();
    expect(screen.getByText("Note: Urgent issue reported by user")).toBeInTheDocument();
    expect(screen.getByText("- Task Removed")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders empty state when no events exist", () => {
    render(<SprintScopeChangeHistory events={[]} />);
    expect(screen.getByText("No scope changes")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalLinkedWorkList } from "./GoalLinkedWorkList";
import type { GoalLink } from "../model/goal";

const MOCK_LINKS: GoalLink[] = [
  {
    id: "link-1",
    goalId: "goal-1",
    userId: "user-1",
    targetType: "PROJECT",
    targetId: "proj-101",
    targetTitle: "LifeOS Platform Foundation",
    targetStatus: "ACTIVE",
  },
  {
    id: "link-2",
    goalId: "goal-1",
    userId: "user-1",
    targetType: "TASK",
    targetId: "task-202",
    targetTitle: "Implement Goals REST API",
    targetStatus: "DONE",
  },
];

describe("GoalLinkedWorkList", () => {
  it("renders list of linked work items and handles unlink action", async () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();

    const { container } = render(
      <GoalLinkedWorkList links={MOCK_LINKS} onAddLink={onAdd} onRemoveLink={onRemove} />,
    );

    expect(screen.getByText("Linked Work Items (2)")).toBeInTheDocument();
    expect(screen.getByText("LifeOS Platform Foundation")).toBeInTheDocument();
    expect(screen.getByText("Implement Goals REST API")).toBeInTheDocument();

    const unlinkBtn = screen.getByRole("button", {
      name: "Unlink project LifeOS Platform Foundation",
    });
    await userEvent.click(unlinkBtn);
    expect(onRemove).toHaveBeenCalledWith("link-1");

    await expectNoAccessibilityViolations(container);
  });
});

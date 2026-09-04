import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueuedConflictResolver } from "../components/QueuedConflictResolver";
import type { QueuedMutation } from "@features/offline-mutation-queue";

describe("QueuedConflictResolver", () => {
  const mockMutation: QueuedMutation = {
    id: "mut-1",
    userId: "user-1",
    type: "CREATE_TASK",
    endpoint: "/api/v1/tasks",
    payload: { title: "Queued Task", priority: "HIGH" },
    idempotencyKey: "ik-create-task-12345",
    dependencyIds: [],
    createdAt: "2026-09-05T00:00:00Z",
    expiresAt: "2026-09-12T00:00:00Z",
    attemptCount: 1,
    maxAttempts: 5,
    status: "conflict",
    lastError: "Task already exists (409)",
  };

  it("renders queued conflict details and error", () => {
    render(<QueuedConflictResolver open={true} onClose={vi.fn()} mutation={mockMutation} />);

    expect(
      screen.getByRole("dialog", { name: "Resolve Queued Mutation Conflict" }),
    ).toBeInTheDocument();
    expect(screen.getByText("CREATE TASK Conflict")).toBeInTheDocument();
    expect(screen.getByText("Task already exists (409)")).toBeInTheDocument();
    expect(screen.getByText(/"title": "Queued Task"/)).toBeInTheDocument();
  });

  it("handles copy payload and retry/discard actions", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    const onClose = vi.fn();

    render(
      <QueuedConflictResolver
        open={true}
        onClose={onClose}
        mutation={mockMutation}
        onRetry={onRetry}
        onDiscard={onDiscard}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy Payload" }));
    expect(screen.getByRole("button", { name: "Copied Payload!" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry Sync" }));
    expect(onRetry).toHaveBeenCalledWith(mockMutation);
    expect(onClose).toHaveBeenCalled();
  });
});

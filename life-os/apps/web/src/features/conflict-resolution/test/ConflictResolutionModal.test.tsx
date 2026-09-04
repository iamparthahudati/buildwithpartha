import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConflictResolutionModal } from "../components/ConflictResolutionModal";
import type { ConflictDetails } from "../model/conflictContract";

describe("ConflictResolutionModal", () => {
  const mockDetails: ConflictDetails = {
    entityId: "task-101",
    entityType: "Task",
    localVersion: 1,
    serverVersion: 2,
    localPayload: { title: "Draft Title", priority: "HIGH" },
    serverPayload: { title: "Server Title", priority: "HIGH" },
    conflictTimestamp: "2026-09-05T01:00:00Z",
  };

  it("renders modal when open with diff table", () => {
    render(<ConflictResolutionModal open={true} onClose={vi.fn()} details={mockDetails} />);

    expect(screen.getByRole("dialog", { name: "Resolve Sync Conflict" })).toBeInTheDocument();
    expect(screen.getByText("1 Field Conflict")).toBeInTheDocument();
    expect(screen.getByText("Draft Title")).toBeInTheDocument();
    expect(screen.getByText("Server Title")).toBeInTheDocument();
  });

  it("handles copy local draft action", async () => {
    const user = userEvent.setup();
    const onCopySuccess = vi.fn();

    render(
      <ConflictResolutionModal
        open={true}
        onClose={vi.fn()}
        details={mockDetails}
        onCopySuccess={onCopySuccess}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy Local Draft" }));
    expect(onCopySuccess).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Copied Backup!" })).toBeInTheDocument();
  });

  it("triggers resolution actions when clicked", async () => {
    const user = userEvent.setup();
    const onUseServer = vi.fn();
    const onOverwriteLocal = vi.fn();

    render(
      <ConflictResolutionModal
        open={true}
        onClose={vi.fn()}
        details={mockDetails}
        onUseServer={onUseServer}
        onOverwriteLocal={onOverwriteLocal}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Use Server Version" }));
    expect(onUseServer).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Overwrite Server" }));
    expect(onOverwriteLocal).toHaveBeenCalledTimes(1);
  });
});

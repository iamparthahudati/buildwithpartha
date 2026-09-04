import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OfflineQueueBadge } from "../components/OfflineQueueBadge";

describe("OfflineQueueBadge (LOS-1313)", () => {
  it("returns null when online and 0 pending items", () => {
    const { container } = render(<OfflineQueueBadge pendingCount={0} isOffline={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders canonical queued phrase and count when offline", () => {
    render(<OfflineQueueBadge pendingCount={2} isOffline />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Queued — will sync when online")).toBeInTheDocument();
    expect(screen.getByText("2 items queued")).toBeInTheDocument();
  });

  it("renders syncing label when replay is in progress", () => {
    render(<OfflineQueueBadge pendingCount={1} isOffline={false} isReplaying />);

    expect(screen.getByText("Syncing queued changes...")).toBeInTheDocument();
  });

  it("triggers onRetry callback when retry button is clicked", async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(<OfflineQueueBadge pendingCount={1} isOffline={false} onRetry={handleRetry} />);

    const retryButton = screen.getByRole("button", { name: /retry syncing/i });
    await user.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders conflict warning and handles onResolveConflicts when conflictCount > 0", async () => {
    const user = userEvent.setup();
    const handleResolve = vi.fn();

    render(
      <OfflineQueueBadge
        pendingCount={0}
        conflictCount={1}
        isOffline={false}
        onResolveConflicts={handleResolve}
      />,
    );

    expect(screen.getByText("1 sync conflict")).toBeInTheDocument();
    const resolveButton = screen.getByRole("button", { name: /resolve sync conflicts/i });
    await user.click(resolveButton);
    expect(handleResolve).toHaveBeenCalledTimes(1);
  });
});

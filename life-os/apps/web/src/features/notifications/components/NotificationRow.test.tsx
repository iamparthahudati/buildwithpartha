import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { NotificationRow } from "./NotificationRow";
import type { NotificationItem } from "../model/notifications";

const SAMPLE_NOTIFICATION: NotificationItem = {
  id: "n-1",
  userId: "user-1",
  category: "DUE_REMINDER",
  title: "Task Due Soon",
  body: "Complete quarterly report by 5 PM.",
  targetUrl: "/life-os/app/tasks/101",
  readAt: null,
  isClearable: true,
  createdAt: "2026-09-01T10:00:00Z",
  version: 1,
};

describe("NotificationRow", () => {
  it("renders notification details and meets WCAG accessibility guidelines", async () => {
    const onMarkRead = vi.fn();
    const onClear = vi.fn();
    const onOpenTarget = vi.fn();

    const { container } = render(
      <NotificationRow
        notification={SAMPLE_NOTIFICATION}
        onMarkRead={onMarkRead}
        onClear={onClear}
        onOpenTarget={onOpenTarget}
      />,
    );

    expect(screen.getByText("Task Due Soon")).toBeInTheDocument();
    expect(screen.getByText("Complete quarterly report by 5 PM.")).toBeInTheDocument();
    expect(screen.getByText(/Unread notification/i)).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("handles mark read, clear, and target navigation clicks", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    const onClear = vi.fn();
    const onOpenTarget = vi.fn();

    render(
      <NotificationRow
        notification={SAMPLE_NOTIFICATION}
        onMarkRead={onMarkRead}
        onClear={onClear}
        onOpenTarget={onOpenTarget}
      />,
    );

    const markReadBtn = screen.getByRole("button", { name: "Mark as read" });
    await user.click(markReadBtn);
    expect(onMarkRead).toHaveBeenCalledWith("n-1");

    const clearBtn = screen.getByRole("button", { name: "Clear notification" });
    await user.click(clearBtn);
    expect(onClear).toHaveBeenCalledWith("n-1");

    const targetBtn = screen.getByRole("button", { name: "Open linked item" });
    await user.click(targetBtn);
    expect(onOpenTarget).toHaveBeenCalledWith("/life-os/app/tasks/101");
  });

  it("disables clear button for security notifications where isClearable is false", () => {
    const securityNotif: NotificationItem = {
      ...SAMPLE_NOTIFICATION,
      category: "SECURITY",
      isClearable: false,
    };

    render(<NotificationRow notification={securityNotif} />);

    const clearBtn = screen.getByRole("button", { name: "Clear notification" });
    expect(clearBtn).toBeDisabled();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConflictResolutionBanner } from "../components/ConflictResolutionBanner";

describe("ConflictResolutionBanner", () => {
  it("renders conflict message and alert role", () => {
    render(<ConflictResolutionBanner message="Custom conflict message" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Custom conflict message")).toBeInTheDocument();
  });

  it("calls action callbacks when buttons clicked", async () => {
    const user = userEvent.setup();
    const onOpenCompare = vi.fn();
    const onUseServer = vi.fn();
    const onOverwriteLocal = vi.fn();

    render(
      <ConflictResolutionBanner
        onOpenCompare={onOpenCompare}
        onUseServer={onUseServer}
        onOverwriteLocal={onOverwriteLocal}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Compare Changes" }));
    expect(onOpenCompare).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Use Server Version" }));
    expect(onUseServer).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Overwrite Server" }));
    expect(onOverwriteLocal).toHaveBeenCalledTimes(1);
  });
});

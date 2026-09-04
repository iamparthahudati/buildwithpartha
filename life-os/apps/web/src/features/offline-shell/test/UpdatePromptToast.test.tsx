import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UpdatePromptToast } from "../components/UpdatePromptToast";
import * as updateHookModule from "../hooks/useServiceWorkerUpdate";

describe("UpdatePromptToast (LOS-1315)", () => {
  it("renders nothing when no update is available", () => {
    vi.spyOn(updateHookModule, "useServiceWorkerUpdate").mockReturnValue({
      isUpdateAvailable: false,
      registration: null,
      applyUpdate: vi.fn(),
      dismissUpdate: vi.fn(),
    });

    const { container } = render(<UpdatePromptToast />);
    expect(container.firstChild).toBeNull();
  });

  it("renders accessible update prompt toast when update is available", () => {
    const applyUpdateMock = vi.fn();
    const dismissUpdateMock = vi.fn();

    vi.spyOn(updateHookModule, "useServiceWorkerUpdate").mockReturnValue({
      isUpdateAvailable: true,
      registration: {} as ServiceWorkerRegistration,
      applyUpdate: applyUpdateMock,
      dismissUpdate: dismissUpdateMock,
    });

    render(<UpdatePromptToast />);

    expect(screen.getByText("New version available")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A new version of LifeOS is ready. Update now to load the latest app shell.",
      ),
    ).toBeInTheDocument();

    const updateButton = screen.getByRole("button", { name: "Update now" });
    expect(updateButton).toBeInTheDocument();

    fireEvent.click(updateButton);
    expect(applyUpdateMock).toHaveBeenCalled();

    const dismissButton = screen.getByRole("button", { name: "Dismiss update notification" });
    fireEvent.click(dismissButton);
    expect(dismissUpdateMock).toHaveBeenCalled();
  });
});

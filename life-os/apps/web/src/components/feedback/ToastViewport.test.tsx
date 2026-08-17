import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { ToastProvider } from "@state/ToastProvider";
import { useToast } from "@state/toastQueue";

import { ToastViewport } from "./ToastViewport";

// A thin harness that pushes through the real hook, the way an application
// screen would — exercising ToastViewport against ToastProvider's actual
// queue rather than a hand-built fixture.
function Harness() {
  const { push } = useToast();

  return (
    <>
      <button type="button" onClick={() => push({ tone: "success", message: "Task added." })}>
        Add task
      </button>
      <button type="button" onClick={() => push({ tone: "success", message: "Project archived." })}>
        Archive project
      </button>
      <ToastViewport />
    </>
  );
}

describe("ToastViewport", () => {
  it("renders nothing while the queue is empty", () => {
    renderWithUser(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    expect(document.querySelector(".lifeos-toast-viewport")).not.toBeInTheDocument();
  });

  it("shows a pushed toast inside a named region", async () => {
    const { user, container } = renderWithUser(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add task" }));

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(within(region).getByText("Task added.")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("dismissing the only toast removes the viewport entirely", async () => {
    const { user } = renderWithUser(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add task" }));
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(document.querySelector(".lifeos-toast-viewport")).not.toBeInTheDocument();
  });

  it("shows more than one distinct toast at once, within the provider's cap", async () => {
    const { user } = renderWithUser(
      <ToastProvider maxVisible={2}>
        <Harness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add task" }));
    await user.click(screen.getByRole("button", { name: "Archive project" }));

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(within(region).getByText("Task added.")).toBeInTheDocument();
    expect(within(region).getByText("Project archived.")).toBeInTheDocument();
  });

  it("keeps a third toast queued past the cap, joining the viewport only once a slot frees up", async () => {
    const { user } = renderWithUser(
      <ToastProvider maxVisible={1}>
        <Harness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add task" }));
    await user.click(screen.getByRole("button", { name: "Archive project" }));

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(within(region).getByText("Task added.")).toBeInTheDocument();
    expect(within(region).queryByText("Project archived.")).not.toBeInTheDocument();

    await user.click(within(region).getByRole("button", { name: "Dismiss notification" }));

    expect(screen.getByText("Project archived.")).toBeInTheDocument();
  });
});

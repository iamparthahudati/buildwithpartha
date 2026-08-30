import { useState } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayBrainCapture, type TodayBrainCaptureProps } from "./TodayBrainCapture";

const BASE_PROPS: TodayBrainCaptureProps = {
  value: "",
  onValueChange: () => {},
  onCapture: () => {},
  countStatus: { type: "ready", unprocessedCount: 3 },
  captureStatus: { type: "idle" },
  isOnline: true,
  brainDumpHref: "/life-os/app/brain-dump",
};

function ControlledCapture(props: Partial<TodayBrainCaptureProps>) {
  const [value, setValue] = useState(props.value ?? "");
  return <TodayBrainCapture {...BASE_PROPS} {...props} value={value} onValueChange={setValue} />;
}

describe("TodayBrainCapture", () => {
  it("shows the unprocessed count and canonical Brain Dump destination", () => {
    renderWithUser(<TodayBrainCapture {...BASE_PROPS} />);

    expect(screen.getByRole("heading", { name: "Brain Dump" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("3 unprocessed Brain Dump Items")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Brain Dump" })).toHaveAttribute(
      "href",
      "/life-os/app/brain-dump",
    );
  });

  it("keeps the field controlled and validates blank content", async () => {
    const onCapture = vi.fn();
    const { user } = renderWithUser(<ControlledCapture onCapture={onCapture} />);
    const field = screen.getByRole("textbox", { name: "What is on your mind?" });

    await user.type(field, "   ");
    await user.click(screen.getByRole("button", { name: "Capture" }));

    expect(screen.getByText("Write something to capture.")).toBeInTheDocument();
    expect(onCapture).not.toHaveBeenCalled();

    await user.type(field, "A thought");
    expect(screen.queryByText("Write something to capture.")).not.toBeInTheDocument();
  });

  it("submits trimmed online content as a create request", async () => {
    const onCapture = vi.fn();
    const { user } = renderWithUser(
      <ControlledCapture value="  Compare hosting options  " onCapture={onCapture} />,
    );

    await user.click(screen.getByRole("button", { name: "Capture" }));
    expect(onCapture).toHaveBeenCalledWith({
      content: "Compare hosting options",
      mode: "create",
    });
  });

  it("uses the Account-scoped queue while offline", async () => {
    const onCapture = vi.fn();
    const { user } = renderWithUser(
      <ControlledCapture value="Remember this" isOnline={false} onCapture={onCapture} />,
    );

    expect(screen.getByText(/Offline\. Queue this capture/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Queue capture" }));
    expect(onCapture).toHaveBeenCalledWith({ content: "Remember this", mode: "queue" });
  });

  it("disables offline capture when the integration has no approved queue", () => {
    const onCapture = vi.fn();
    renderWithUser(
      <ControlledCapture
        value="Keep this visible"
        isOnline={false}
        offlineQueueSupported={false}
        onCapture={onCapture}
      />,
    );

    expect(screen.getByText(/Keep this page open and reconnect/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture unavailable offline" })).toBeDisabled();
    expect(screen.getByRole("textbox")).toHaveValue("Keep this visible");
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("announces saved, failed, and queued outcomes without clearing caller text", () => {
    const { rerender } = renderWithUser(
      <TodayBrainCapture {...BASE_PROPS} value="Draft remains" captureStatus={{ type: "saved" }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Brain Dump Item added.");

    rerender(
      <TodayBrainCapture
        {...BASE_PROPS}
        value="Draft remains"
        captureStatus={{
          type: "error",
          message: "We couldn't add this Brain Dump Item. Your draft is still here.",
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Your draft is still here");
    expect(screen.getByRole("textbox")).toHaveValue("Draft remains");

    rerender(
      <TodayBrainCapture
        {...BASE_PROPS}
        value="Draft remains"
        isOnline={false}
        captureStatus={{ type: "queued" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Sync is not confirmed yet");
    expect(screen.getByRole("textbox")).toHaveValue("Draft remains");
  });

  it("keeps capture usable when only the unprocessed count fails", async () => {
    const onCapture = vi.fn();
    const onRetryCount = vi.fn();
    const { user } = renderWithUser(
      <ControlledCapture
        value="A useful thought"
        onCapture={onCapture}
        countStatus={{ type: "error", message: "The unprocessed count couldn't load." }}
        onRetryCount={onRetryCount}
      />,
    );

    expect(screen.getByText("Count unavailable")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry count" }));
    expect(onRetryCount).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Capture" }));
    expect(onCapture).toHaveBeenCalledTimes(1);
  });

  it("exposes a stable pending action without losing the draft", () => {
    renderWithUser(
      <TodayBrainCapture
        {...BASE_PROPS}
        value="A pending thought"
        captureStatus={{ type: "saving" }}
      />,
    );

    expect(screen.getByRole("button", { name: "Capture" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("textbox")).toHaveValue("A pending thought");
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("has no accessibility violations in online, offline, and error states", async () => {
    const { container, rerender } = renderWithUser(
      <TodayBrainCapture {...BASE_PROPS} value="A thought" />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayBrainCapture
        {...BASE_PROPS}
        value="A thought"
        isOnline={false}
        captureStatus={{ type: "queued" }}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayBrainCapture
        {...BASE_PROPS}
        value="A thought"
        countStatus={{ type: "error", message: "The count couldn't load." }}
        captureStatus={{ type: "error", message: "Your draft is still here. Try again." }}
        onRetryCount={() => {}}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});

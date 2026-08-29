import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { BrainDumpCaptureBar } from "./BrainDumpCaptureBar";

describe("BrainDumpCaptureBar", () => {
  it("shows empty validation error when submitting blank content", async () => {
    const onCapture = vi.fn();
    render(
      <BrainDumpCaptureBar
        isOnline={true}
        captureStatus={{ type: "idle" }}
        onCapture={onCapture}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /capture/i }));

    expect(screen.getByText("Write something to capture.")).toBeInTheDocument();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("calls onCapture with trimmed content when submitted", async () => {
    const onCapture = vi.fn();
    render(
      <BrainDumpCaptureBar
        isOnline={true}
        captureStatus={{ type: "idle" }}
        onCapture={onCapture}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: /what is on your mind/i });
    await userEvent.type(textarea, "  Buy milk  ");
    await userEvent.click(screen.getByRole("button", { name: /capture/i }));

    expect(onCapture).toHaveBeenCalledWith("Buy milk");
  });

  it("shows offline warning and queue button when offline", async () => {
    render(
      <BrainDumpCaptureBar isOnline={false} captureStatus={{ type: "idle" }} onCapture={vi.fn()} />,
    );

    expect(
      screen.getByText(
        "Offline — this item will be queued. Keep this page open until you reconnect.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /queue item/i })).toBeInTheDocument();
  });

  it("shows saving state when captureStatus is saving", () => {
    render(
      <BrainDumpCaptureBar
        isOnline={true}
        captureStatus={{ type: "saving" }}
        onCapture={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: /capture/i });
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Capturing Brain Dump item");
  });

  it("shows error message when captureStatus is error", () => {
    render(
      <BrainDumpCaptureBar
        isOnline={true}
        captureStatus={{ type: "error", message: "Network failed." }}
        onCapture={vi.fn()}
      />,
    );

    expect(screen.getByText("Network failed.")).toBeInTheDocument();
  });

  it("meets accessibility requirements", async () => {
    const { container } = render(
      <BrainDumpCaptureBar isOnline={true} captureStatus={{ type: "idle" }} onCapture={vi.fn()} />,
    );
    await expectNoAccessibilityViolations(container);
  });
});

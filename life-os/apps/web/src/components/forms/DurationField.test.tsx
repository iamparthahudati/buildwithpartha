import { useState } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DurationField } from "./DurationField";

function ControlledDurationField(props: {
  readonly initial?: number | null;
  readonly onValueChange?: (value: number | null) => void;
  readonly min?: number;
  readonly max?: number;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}) {
  const [value, setValue] = useState<number | null>(props.initial ?? null);

  return (
    <DurationField
      legend="Estimate"
      locale="en-US"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange?.(next);
      }}
      {...(props.min === undefined ? {} : { min: props.min })}
      {...(props.max === undefined ? {} : { max: props.max })}
      {...(props.error ? { error: props.error } : {})}
      {...(props.disabled ? { disabled: props.disabled } : {})}
      {...(props.readOnly ? { readOnly: props.readOnly } : {})}
    />
  );
}

describe("DurationField", () => {
  it("groups a real hours field and a real minutes field under one legend", async () => {
    const { container } = renderWithUser(<ControlledDurationField />);

    expect(screen.getByRole("group", { name: "Estimate" })).toBeInTheDocument();
    expect(screen.getByLabelText("Hours")).toBeInTheDocument();
    expect(screen.getByLabelText("Minutes")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("starts both fields empty when the value is unset", () => {
    renderWithUser(<ControlledDurationField />);

    expect(screen.getByLabelText("Hours")).toHaveValue(null);
    expect(screen.getByLabelText("Minutes")).toHaveValue(null);
  });

  it("splits a total into hours and minutes for display", () => {
    renderWithUser(<ControlledDurationField initial={90} />);

    expect(screen.getByLabelText("Hours")).toHaveValue(1);
    expect(screen.getByLabelText("Minutes")).toHaveValue(30);
  });

  it("combines a typed hours value with the current minutes into one total", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <ControlledDurationField initial={30} onValueChange={onValueChange} />,
    );

    await user.clear(screen.getByLabelText("Hours"));
    await user.type(screen.getByLabelText("Hours"), "2");

    expect(onValueChange).toHaveBeenLastCalledWith(150);
  });

  it("normalizes an overflowing minutes entry into whole hours", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <ControlledDurationField initial={60} onValueChange={onValueChange} />,
    );

    // Typing 90 minutes on top of the existing 1 hour is a real, common
    // overflow — this is what carries it into 2h30m instead of an invalid
    // "1h 90m".
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "90");

    expect(onValueChange).toHaveBeenLastCalledWith(150);
    expect(screen.getByLabelText("Hours")).toHaveValue(2);
    expect(screen.getByLabelText("Minutes")).toHaveValue(30);
  });

  it("shows a readable summary once there is a value", () => {
    renderWithUser(<ControlledDurationField initial={90} />);

    expect(screen.getByText("1 hr 30 min")).toBeInTheDocument();
  });

  it("carries a long, spoken form for assistive technology", () => {
    renderWithUser(<ControlledDurationField initial={90} />);

    expect(screen.getByText("1 hour 30 minutes")).toHaveClass("lifeos-visually-hidden");
  });

  it("shows no summary while the value is unset", () => {
    renderWithUser(<ControlledDurationField />);

    expect(screen.queryByText(/hr|min/)).not.toBeInTheDocument();
  });

  it("clears the whole duration as one action, back to unset", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <ControlledDurationField initial={90} onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Clear duration" }));

    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByLabelText("Hours")).toHaveValue(null);
    expect(screen.getByLabelText("Minutes")).toHaveValue(null);
  });

  it("hides the clear action while the duration is already unset", () => {
    renderWithUser(<ControlledDurationField />);

    expect(screen.queryByRole("button", { name: "Clear duration" })).not.toBeInTheDocument();
  });

  it("floors an already-negative committed value at zero, as from a paste", () => {
    // A lone "-" is not a valid floating-point number, so the DOM itself
    // never holds a negative number mid-keystroke — this can only happen from
    // a value set in one go, which fireEvent.change models more honestly than
    // typing a "-" character by character.
    const onValueChange = vi.fn();
    renderWithUser(<ControlledDurationField initial={30} onValueChange={onValueChange} />);

    fireEvent.change(screen.getByLabelText("Hours"), { target: { value: "-5" } });

    expect(onValueChange).toHaveBeenLastCalledWith(30);
  });

  it("reports a value over the maximum without rewriting what was typed", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <ControlledDurationField initial={0} max={125} onValueChange={onValueChange} />,
    );

    // 3 hours alone already exceeds 125 minutes, even before minutes count.
    await user.clear(screen.getByLabelText("Hours"));
    await user.type(screen.getByLabelText("Hours"), "3");

    // The value the caller receives is exactly what was typed — 180, not a
    // silently substituted 125 — because rewriting it live is what produced
    // the very bug this design avoids: the display snapping out from under
    // an in-progress keystroke.
    expect(onValueChange).toHaveBeenLastCalledWith(180);
    expect(screen.getByLabelText("Hours")).toHaveValue(3);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a duration of at most 2 hours 5 minutes.",
    );
  });

  it("reports a value under the minimum without rewriting what was typed", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <ControlledDurationField initial={30} min={15} onValueChange={onValueChange} />,
    );

    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "5");

    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByLabelText("Minutes")).toHaveValue(5);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a duration of at least 15 minutes.");
  });

  it("says nothing once a value returns to within bounds", () => {
    const { rerender } = renderWithUser(
      <DurationField
        legend="Estimate"
        locale="en-US"
        value={5}
        min={15}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <DurationField
        legend="Estimate"
        locale="en-US"
        value={30}
        min={15}
        onValueChange={() => {}}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lets a caller's own error override the built-in bounds check", () => {
    renderWithUser(
      <DurationField
        legend="Estimate"
        locale="en-US"
        value={5}
        min={15}
        onValueChange={() => {}}
        error="This estimate has already been approved."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("This estimate has already been approved.");
    expect(screen.queryByText(/at least/)).not.toBeInTheDocument();
  });

  it("shows a caller-supplied error, e.g. a business rule beyond the bounds", async () => {
    const { container } = renderWithUser(
      <ControlledDurationField initial={5} error="Estimates under 15 minutes need approval." />,
    );

    expect(screen.getByRole("group")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Estimates under 15 minutes need approval.",
    );
    await expectNoAccessibilityViolations(container);
  });

  it("disables both fields and hides the clear action together", () => {
    renderWithUser(<ControlledDurationField initial={90} disabled />);

    expect(screen.getByLabelText("Hours")).toBeDisabled();
    expect(screen.getByLabelText("Minutes")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Clear duration" })).not.toBeInTheDocument();
  });
});

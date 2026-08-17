import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DateRangeField, type DateRangePreset, type DateRangeValue } from "./DateRangeField";
import { buildCommonDateRangePresets } from "./dateRangePresets";

function ControlledDateRangeField(props: {
  readonly initial?: DateRangeValue;
  readonly onValueChange?: (value: DateRangeValue) => void;
  readonly error?: string;
  readonly min?: string;
  readonly max?: string;
  readonly presets?: readonly DateRangePreset[];
  readonly disabled?: boolean;
}) {
  const [value, setValue] = useState<DateRangeValue>(props.initial ?? { start: null, end: null });

  return (
    <DateRangeField
      legend="Reporting period"
      timeZone="Asia/Kolkata"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange?.(next);
      }}
      {...(props.error ? { error: props.error } : {})}
      {...(props.min ? { min: props.min } : {})}
      {...(props.max ? { max: props.max } : {})}
      {...(props.presets ? { presets: props.presets } : {})}
      {...(props.disabled ? { disabled: props.disabled } : {})}
    />
  );
}

describe("DateRangeField", () => {
  it("groups two real date fields under one legend", async () => {
    const { container } = renderWithUser(<ControlledDateRangeField />);

    expect(screen.getByRole("group", { name: "Reporting period" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).toBeInTheDocument();
    expect(screen.getByLabelText("End date")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("updates the start and end independently", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(<ControlledDateRangeField onValueChange={onValueChange} />);

    await user.type(screen.getByLabelText("Start date"), "2026-08-17");
    expect(onValueChange).toHaveBeenLastCalledWith({ start: "2026-08-17", end: null });

    await user.type(screen.getByLabelText("End date"), "2026-08-24");
    expect(onValueChange).toHaveBeenLastCalledWith({ start: "2026-08-17", end: "2026-08-24" });
  });

  it("names an end date chosen before the start, without a caller supplying anything", async () => {
    const { container } = renderWithUser(
      <ControlledDateRangeField initial={{ start: "2026-08-20", end: "2026-08-10" }} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an end date on or after the start date.",
    );
    expect(screen.getByRole("group")).toHaveAttribute("aria-invalid", "true");
    await expectNoAccessibilityViolations(container);
  });

  it("says nothing about order once the dates are corrected", () => {
    const { rerender } = renderWithUser(
      <DateRangeField
        legend="Reporting period"
        timeZone="Asia/Kolkata"
        value={{ start: "2026-08-20", end: "2026-08-10" }}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <DateRangeField
        legend="Reporting period"
        timeZone="Asia/Kolkata"
        value={{ start: "2026-08-10", end: "2026-08-20" }}
        onValueChange={() => {}}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lets a caller's own error override the built-in order check", () => {
    renderWithUser(
      <DateRangeField
        legend="Reporting period"
        timeZone="Asia/Kolkata"
        value={{ start: "2026-08-20", end: "2026-08-10" }}
        onValueChange={() => {}}
        error="This period has already been finalized."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("This period has already been finalized.");
  });

  it("constrains each side's native picker against the other's current value", () => {
    renderWithUser(<ControlledDateRangeField initial={{ start: "2026-08-17", end: null }} />);

    // The end date cannot be chosen before the start, on top of the message.
    expect(screen.getByLabelText("End date")).toHaveAttribute("min", "2026-08-17");
  });

  it("clears one side independently through its own clear action", async () => {
    const { user } = renderWithUser(
      <ControlledDateRangeField initial={{ start: "2026-08-17", end: "2026-08-24" }} />,
    );

    await user.click(screen.getByRole("button", { name: "Clear start date" }));

    expect(screen.getByLabelText("Start date")).toHaveValue("");
    expect(screen.getByLabelText("End date")).toHaveValue("2026-08-24");
  });

  it("applies a preset relative to today in the given timezone", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <ControlledDateRangeField
        onValueChange={onValueChange}
        presets={[{ label: "Today", range: (today) => ({ start: today, end: today }) }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Today" }));

    const [[value]] = onValueChange.mock.calls.slice(-1) as [[DateRangeValue]];
    expect(value.start).toBe(value.end);
    expect(value.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("disables both fields and every preset together", () => {
    renderWithUser(
      <ControlledDateRangeField
        disabled
        presets={[{ label: "Today", range: (today) => ({ start: today, end: today }) }]}
      />,
    );

    expect(screen.getByLabelText("Start date")).toBeDisabled();
    expect(screen.getByLabelText("End date")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();
  });
});

describe("buildCommonDateRangePresets", () => {
  it("computes every preset relative to the supplied today", () => {
    const [today, nextSeven, nextThirty] = buildCommonDateRangePresets();

    expect(today?.range("2026-08-17")).toEqual({ start: "2026-08-17", end: "2026-08-17" });
    expect(nextSeven?.range("2026-08-17")).toEqual({ start: "2026-08-17", end: "2026-08-23" });
    expect(nextThirty?.range("2026-08-17")).toEqual({ start: "2026-08-17", end: "2026-09-15" });
  });
});

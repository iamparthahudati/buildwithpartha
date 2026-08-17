import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DateTimeField, type DateTimeValue } from "./DateTimeField";

function ControlledDateTimeField(props: {
  readonly initial?: DateTimeValue;
  readonly onValueChange?: (value: DateTimeValue) => void;
  readonly timeZone?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}) {
  const [value, setValue] = useState<DateTimeValue>(props.initial ?? { date: null, time: null });

  return (
    <DateTimeField
      legend="Reminder time"
      timeZone={props.timeZone ?? "America/New_York"}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange?.(next);
      }}
      {...(props.error ? { error: props.error } : {})}
      {...(props.disabled ? { disabled: props.disabled } : {})}
      {...(props.readOnly ? { readOnly: props.readOnly } : {})}
    />
  );
}

describe("DateTimeField", () => {
  it("groups a real date field and a real time field under one legend", async () => {
    const { container } = renderWithUser(<ControlledDateTimeField />);

    expect(screen.getByRole("group", { name: "Reminder time" })).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Time")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("updates the date and time independently", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(<ControlledDateTimeField onValueChange={onValueChange} />);

    await user.type(screen.getByLabelText("Date"), "2026-08-17");
    expect(onValueChange).toHaveBeenLastCalledWith({ date: "2026-08-17", time: null });

    await user.type(screen.getByLabelText("Time"), "0930AM");
    expect(onValueChange).toHaveBeenLastCalledWith({ date: "2026-08-17", time: "09:30" });
  });

  it("names its timezone, since the field is ambiguous without one", () => {
    renderWithUser(<ControlledDateTimeField timeZone="Asia/Kolkata" />);

    expect(screen.getByText("Times shown in Asia/Kolkata.")).toBeInTheDocument();
  });

  it("says nothing extra about an ordinary date and time", () => {
    renderWithUser(<ControlledDateTimeField initial={{ date: "2026-08-17", time: "09:30" }} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says nothing about a value that is still incomplete", () => {
    renderWithUser(<ControlledDateTimeField initial={{ date: "2026-03-08", time: null }} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // 2026-03-08 is when America/New_York clocks spring forward: 01:59:59 EST
  // is followed directly by 03:00:00 EDT, so 02:30 never happens there.
  it("reports a spring-forward gap as an error, without a caller writing it", async () => {
    const { container } = renderWithUser(
      <ControlledDateTimeField initial={{ date: "2026-03-08", time: "02:30" }} />,
    );

    expect(screen.getByRole("group")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This time does not exist in America/New_York because of a daylight saving change.",
    );
    await expectNoAccessibilityViolations(container);
  });

  // 2026-11-01 is when America/New_York clocks fall back: 01:30 happens twice,
  // an hour apart.
  it("reports a fall-back repeat as a non-blocking warning, not an error", async () => {
    const { container } = renderWithUser(
      <ControlledDateTimeField initial={{ date: "2026-11-01", time: "01:30" }} />,
    );

    expect(screen.getByRole("group")).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "This time happens twice in America/New_York because of a daylight saving change.",
    );
    await expectNoAccessibilityViolations(container);
  });

  it("finds no gap or ambiguity in a zone with no daylight saving", () => {
    renderWithUser(
      <ControlledDateTimeField
        timeZone="Asia/Kolkata"
        initial={{ date: "2026-03-08", time: "02:30" }}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("lets a caller's own error override the built-in DST check", () => {
    renderWithUser(
      <ControlledDateTimeField
        initial={{ date: "2026-03-08", time: "02:30" }}
        error="This reminder has already been sent."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("This reminder has already been sent.");
    expect(screen.queryByText(/does not exist/)).not.toBeInTheDocument();
  });

  it("clears the date independently through its own clear action", async () => {
    const { user } = renderWithUser(
      <ControlledDateTimeField initial={{ date: "2026-08-17", time: "09:30" }} />,
    );

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(screen.getByLabelText("Date")).toHaveValue("");
    expect(screen.getByLabelText("Time")).toHaveValue("09:30");
  });

  it("clears the time independently through its own clear action", async () => {
    const { user } = renderWithUser(
      <ControlledDateTimeField initial={{ date: "2026-08-17", time: "09:30" }} />,
    );

    await user.click(screen.getByRole("button", { name: "Clear time" }));

    expect(screen.getByLabelText("Time")).toHaveValue("");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-17");
  });

  it("disables both fields together", () => {
    renderWithUser(<ControlledDateTimeField disabled />);

    expect(screen.getByLabelText("Date")).toBeDisabled();
    expect(screen.getByLabelText("Time")).toBeDisabled();
  });
});

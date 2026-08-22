import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayHeader } from "./TodayHeader";

const BASE_PROPS = {
  displayName: "Partha",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  onQuickAddClick: () => {},
};

describe("TodayHeader", () => {
  it("renders a greeting with the user's display name", () => {
    // Pin hour to 09:00 IST — morning
    const morningInstant = new Date("2026-08-20T03:30:00Z"); // 09:00 IST
    renderWithUser(<TodayHeader {...BASE_PROPS} now={morningInstant} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good morning, Partha");
  });

  it("says Good afternoon between 12:00 and 16:59 local time", () => {
    const afternoonInstant = new Date("2026-08-20T09:00:00Z"); // 14:30 IST
    renderWithUser(<TodayHeader {...BASE_PROPS} now={afternoonInstant} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good afternoon, Partha");
  });

  it("says Good evening from 17:00 local time onward", () => {
    const eveningInstant = new Date("2026-08-20T12:30:00Z"); // 18:00 IST
    renderWithUser(<TodayHeader {...BASE_PROPS} now={eveningInstant} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good evening, Partha");
  });

  it("renders the local date formatted in the user's locale and timezone", () => {
    const now = new Date("2026-08-20T03:30:00Z"); // 09:00 IST on 20 Aug
    renderWithUser(<TodayHeader {...BASE_PROPS} locale="en-US" now={now} />);

    // Should contain "August" or "Aug" and "20" somewhere in the date text
    const heading = screen.getByRole("heading", { level: 1 });
    const dateText = heading.parentElement?.textContent ?? "";
    expect(dateText).toMatch(/20/);
    expect(dateText).toMatch(/August/i);
  });

  it("renders the timezone identifier in the date line", () => {
    const now = new Date("2026-08-20T03:30:00Z");
    const { container } = renderWithUser(<TodayHeader {...BASE_PROPS} now={now} />);

    const tzEl = container.querySelector(".lifeos-today-header__tz");
    expect(tzEl).toBeInTheDocument();
    expect(tzEl).toHaveTextContent("Asia/Kolkata");
    expect(tzEl).not.toHaveAttribute("aria-hidden");
  });

  it("renders an optional subtitle below the date", () => {
    const now = new Date("2026-08-20T03:30:00Z");
    renderWithUser(
      <TodayHeader {...BASE_PROPS} now={now} subtitle="You have 3 tasks planned today." />,
    );

    expect(screen.getByText("You have 3 tasks planned today.")).toBeInTheDocument();
  });

  it("renders no subtitle when not supplied", () => {
    const now = new Date("2026-08-20T03:30:00Z");
    const { container } = renderWithUser(<TodayHeader {...BASE_PROPS} now={now} />);

    expect(container.querySelector(".lifeos-today-header__subtitle")).not.toBeInTheDocument();
  });

  it("fires onQuickAddClick when the Quick Add button is clicked", async () => {
    const onQuickAddClick = vi.fn();
    const now = new Date("2026-08-20T03:30:00Z");
    const { user } = renderWithUser(
      <TodayHeader {...BASE_PROPS} now={now} onQuickAddClick={onQuickAddClick} />,
    );

    await user.click(screen.getByRole("button", { name: /quick add/i }));
    expect(onQuickAddClick).toHaveBeenCalledTimes(1);
  });

  it("renders the heading as level 1 for page outline integrity", () => {
    const now = new Date("2026-08-20T03:30:00Z");
    renderWithUser(<TodayHeader {...BASE_PROPS} now={now} />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("has no accessibility violations across morning, afternoon, and evening states", async () => {
    const morning = new Date("2026-08-20T03:30:00Z");
    const afternoon = new Date("2026-08-20T09:00:00Z");
    const evening = new Date("2026-08-20T12:30:00Z");

    const { container, rerender } = renderWithUser(<TodayHeader {...BASE_PROPS} now={morning} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TodayHeader {...BASE_PROPS} now={afternoon} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TodayHeader {...BASE_PROPS} now={evening} subtitle="A subtitle for the evening." />);
    await expectNoAccessibilityViolations(container);
  });

  it("correctly derives greeting in a non-IST timezone (Europe/Berlin, morning)", () => {
    // 06:00 Berlin = morning; UTC = 04:00 in summer (UTC+2)
    const morningBerlin = new Date("2026-08-20T04:00:00Z");
    renderWithUser(
      <TodayHeader {...BASE_PROPS} timeZone="Europe/Berlin" locale="en-DE" now={morningBerlin} />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good morning, Partha");
  });
});

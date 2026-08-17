import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Timeline, type TimelineEntry } from "./Timeline";

const ENTRIES: readonly TimelineEntry[] = [
  {
    id: "kickoff",
    title: "Kickoff",
    description: "Project charter approved.",
    date: "2026-01-05",
    status: "completed",
  },
  {
    id: "design",
    title: "Design review",
    date: "2026-02-10",
    status: "current",
  },
  {
    id: "launch",
    title: "Launch",
    date: "2026-03-01",
    status: "overdue",
  },
  {
    id: "retro",
    title: "Retrospective",
    date: "2026-03-15",
    status: "future",
  },
];

describe("Timeline", () => {
  it("renders a real, labelled ordered list with one item per entry", () => {
    renderWithUser(<Timeline entries={ENTRIES} label="Project milestones" locale="en-US" />);

    const list = screen.getByRole("list", { name: "Project milestones" });
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("renders each entry's title, formatted date and status label", () => {
    renderWithUser(<Timeline entries={ENTRIES} label="Project milestones" locale="en-US" />);

    expect(screen.getByText("Kickoff")).toBeInTheDocument();
    expect(screen.getByText("Jan 5, 2026")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("renders an optional description only when given", () => {
    renderWithUser(<Timeline entries={ENTRIES} label="Project milestones" locale="en-US" />);

    expect(screen.getByText("Project charter approved.")).toBeInTheDocument();
  });

  it("titles stay plain text by default, joining the outline only when titleLevel is given", () => {
    const { rerender } = renderWithUser(
      <Timeline entries={ENTRIES} label="Project milestones" locale="en-US" />,
    );
    expect(screen.queryByRole("heading", { name: "Kickoff" })).not.toBeInTheDocument();

    rerender(
      <Timeline entries={ENTRIES} label="Project milestones" locale="en-US" titleLevel={3} />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Kickoff" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(
      <Timeline entries={ENTRIES} label="Project milestones" locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);
  });

  it("has no axe violations with real headings", async () => {
    const { container } = renderWithUser(
      <Timeline entries={ENTRIES} label="Project milestones" locale="en-US" titleLevel={3} />,
    );
    await expectNoAccessibilityViolations(container);
  });
});

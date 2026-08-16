import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Button } from "./Button";
import { DividerList, DividerListItem } from "./DividerList";
import { Logo } from "./Logo";
import { Surface } from "./Surface";
import { Tooltip } from "./Tooltip";
import { LiveRegion, VisuallyHidden } from "./VisuallyHidden";

describe("Tooltip", () => {
  it("opens on focus without making the user wait", async () => {
    const { user, container } = renderWithUser(
      <Tooltip content="Archives the project and keeps its tasks">
        <Button>Archive</Button>
      </Tooltip>,
    );

    await user.tab();

    // A keyboard user has already committed to the control; a delay is a pause.
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Archives the project and keeps its tasks",
    );
    await expectNoAccessibilityViolations(container);
  });

  it("describes the control rather than renaming it", async () => {
    const { user } = renderWithUser(
      <Tooltip content="Archives the project and keeps its tasks">
        <Button>Archive</Button>
      </Tooltip>,
    );

    await user.tab();

    const button = screen.getByRole("button", { name: "Archive" });
    expect(button).toHaveAccessibleDescription("Archives the project and keeps its tasks");
  });

  it("waits before opening on hover", async () => {
    const { user } = renderWithUser(
      <Tooltip content="Archives the project" openDelayMs={400}>
        <Button>Archive</Button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button"));

    // A pointer crossing a toolbar must not flash five tooltips on the way.
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens on hover once the delay has passed", async () => {
    const { user } = renderWithUser(
      <Tooltip content="Archives the project" openDelayMs={0}>
        <Button>Archive</Button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button"));

    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("closes on Escape and stays closed while the pointer is still there", async () => {
    const { user } = renderWithUser(
      <Tooltip content="Archives the project" openDelayMs={0}>
        <Button>Archive</Button>
      </Tooltip>,
    );

    await user.tab();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Reopening on the next pointer event would make the dismissal meaningless.
    await user.hover(screen.getByRole("button"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes when focus leaves the control", async () => {
    const { user } = renderWithUser(
      <>
        <Tooltip content="Archives the project">
          <Button>Archive</Button>
        </Tooltip>
        <Button>Delete</Button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("VisuallyHidden", () => {
  it("keeps its text in the accessibility tree", async () => {
    const { container } = renderWithUser(<VisuallyHidden>3 unread notifications</VisuallyHidden>);

    // display:none would remove it; this has to stay readable.
    expect(screen.getByText("3 unread notifications")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("takes no space in the layout", () => {
    renderWithUser(<VisuallyHidden>3 unread notifications</VisuallyHidden>);

    expect(screen.getByText("3 unread notifications")).toHaveClass("lifeos-visually-hidden");
  });

  it("becomes a block element when the content needs one", () => {
    renderWithUser(<VisuallyHidden as="div">Weekly summary</VisuallyHidden>);

    // A span holding block content is invalid, so the element is a choice.
    expect(screen.getByText("Weekly summary").tagName).toBe("DIV");
  });
});

describe("LiveRegion", () => {
  it("exists before it has anything to say", () => {
    renderWithUser(<LiveRegion message="" />);

    // A region that appears together with its text is frequently not announced
    // at all: assistive technology has to be watching the node beforehand.
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces politely by default and interrupts only when asked", () => {
    const { rerender } = renderWithUser(<LiveRegion message="Task saved" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    rerender(<LiveRegion message="Your session is about to expire" politeness="assertive" />);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("reads the message as a whole rather than word by word", () => {
    renderWithUser(<LiveRegion message="3 filters applied" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  it("is hidden by default and can be shown", () => {
    const { rerender } = renderWithUser(<LiveRegion message="Saving changes…" />);
    expect(screen.getByRole("status")).toHaveClass("lifeos-visually-hidden");

    rerender(<LiveRegion message="Saving changes…" visible />);
    expect(screen.getByRole("status")).toHaveClass("lifeos-live-region");
  });
});

describe("Logo", () => {
  it("reads as the product name, and never as a reference product", async () => {
    const { container } = renderWithUser(<Logo />);

    expect(screen.getByText("LifeOS")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/one system/i);
    await expectNoAccessibilityViolations(container);
  });

  it("names the destination when the mark stands alone", async () => {
    const { container } = renderWithUser(<Logo variant="symbol" label="LifeOS home" />);

    expect(screen.getByRole("img", { name: "LifeOS home" })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("stays silent when something around it already names the destination", () => {
    const { container } = renderWithUser(<Logo variant="symbol" decorative />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("does not announce the symbol beside the name it already carries", () => {
    const { container } = renderWithUser(<Logo variant="lockup" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("silences the wordmark when a link around it already says the name", () => {
    const { container } = renderWithUser(<Logo variant="wordmark" decorative />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Surface", () => {
  it("renders a plain card with no invented semantics", async () => {
    const { container } = renderWithUser(<Surface>Portfolio refresh</Surface>);

    expect(container.firstElementChild?.tagName).toBe("DIV");
    await expectNoAccessibilityViolations(container);
  });

  it("gives a section its name from its own heading", async () => {
    const { container } = renderWithUser(
      <Surface as="section" title="Today's tasks" titleLevel={2}>
        Nothing due today.
      </Surface>,
    );

    const region = screen.getByRole("region", { name: "Today's tasks" });
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent("Today's tasks");
    await expectNoAccessibilityViolations(container);
  });

  it("does not claim a landmark it cannot name", () => {
    renderWithUser(<Surface as="section">Nothing due today.</Surface>);

    // An unnamed region appears in the landmark list with nothing to tell it
    // apart from every other one.
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("keeps its heading level independent of its visual size", () => {
    renderWithUser(
      <Surface as="section" title="Upcoming milestones" titleLevel={3}>
        Nothing scheduled.
      </Surface>,
    );

    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("stays unfocusable when interactive, so the real control keeps the tab stop", async () => {
    const { container, user } = renderWithUser(
      <Surface interactive title="Portfolio refresh">
        <Button>Open project</Button>
      </Surface>,
    );

    await user.tab();

    expect(screen.getByRole("button", { name: "Open project" })).toHaveFocus();
    expect(container.firstElementChild).not.toHaveAttribute("tabindex");
  });
});

describe("DividerList", () => {
  it("is a real list, so the item count is answerable", async () => {
    const { container } = renderWithUser(
      <DividerList label="Today's tasks">
        <DividerListItem>Prepare weekly review</DividerListItem>
        <DividerListItem>Compare hosting options</DividerListItem>
        <DividerListItem>Organize tax documents</DividerListItem>
      </DividerList>,
    );

    const list = screen.getByRole("list", { name: "Today's tasks" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    await expectNoAccessibilityViolations(container);
  });

  it("keeps separators out of the markup entirely", () => {
    const { container } = renderWithUser(
      <DividerList label="Today's tasks">
        <DividerListItem>Prepare weekly review</DividerListItem>
        <DividerListItem>Compare hosting options</DividerListItem>
      </DividerList>,
    );

    // A ul whose children alternate between li and a decorative div is invalid
    // and makes assistive technology report the wrong count.
    expect(container.querySelectorAll("ul > *")).toHaveLength(2);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("stops claiming a count when the rows are not a list", async () => {
    const { container } = renderWithUser(
      <DividerList as="div" label="Notification settings">
        <DividerListItem>Email reminders</DividerListItem>
        <DividerListItem>Weekly summary</DividerListItem>
      </DividerList>,
    );

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Notification settings" })).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(0);
    await expectNoAccessibilityViolations(container);
  });

  it("renders rows as the element its list needs, not the one a caller guessed", () => {
    const { container } = renderWithUser(
      <DividerList as="ol" label="Sprint order">
        <DividerListItem>Prepare weekly review</DividerListItem>
      </DividerList>,
    );

    expect(container.querySelector("ol > li")).toBeInTheDocument();
  });
});

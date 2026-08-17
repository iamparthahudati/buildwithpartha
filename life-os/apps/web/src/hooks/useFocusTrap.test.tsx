import { useRef, useState, type RefObject } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "@test/render";

import { useFocusTrap } from "./useFocusTrap";

function Harness({
  active,
  initialFocusOn,
}: {
  readonly active: boolean;
  readonly initialFocusOn?: "second";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(
    containerRef,
    active,
    initialFocusOn === "second" ? (secondRef as RefObject<HTMLElement | null>) : undefined,
  );

  return (
    <>
      <button type="button">Outside before</button>
      <div ref={containerRef} tabIndex={-1}>
        <button type="button">First</button>
        <button type="button" ref={secondRef}>
          Second
        </button>
        <button type="button">Third</button>
      </div>
      <button type="button">Outside after</button>
    </>
  );
}

function EmptyHarness() {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, true);

  return (
    <div ref={containerRef} tabIndex={-1}>
      <p>Nothing focusable in here.</p>
    </div>
  );
}

function ToggleHarness() {
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, active);

  return (
    <>
      <button type="button" onClick={() => setActive(true)}>
        Open
      </button>
      {active ? (
        <div ref={containerRef} tabIndex={-1}>
          <button type="button" onClick={() => setActive(false)}>
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}

describe("useFocusTrap", () => {
  it("moves focus to the first focusable descendant on activation", () => {
    renderWithUser(<Harness active />);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("moves focus to an explicit initial-focus target instead, when given one", () => {
    renderWithUser(<Harness active initialFocusOn="second" />);

    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();
  });

  it("does nothing while inactive", () => {
    renderWithUser(<Harness active={false} />);

    expect(document.body).toHaveFocus();
  });

  it("wraps Tab from the last focusable descendant back to the first", async () => {
    const { user } = renderWithUser(<Harness active />);

    screen.getByRole("button", { name: "Third" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("wraps Shift+Tab from the first focusable descendant back to the last", async () => {
    const { user } = renderWithUser(<Harness active />);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: "Third" })).toHaveFocus();
  });

  it("never lets Tab reach content outside the container", async () => {
    const { user } = renderWithUser(<Harness active />);

    await user.tab();
    await user.tab();
    await user.tab();

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Outside after" })).not.toHaveFocus();
  });

  it("falls back to the container itself when nothing inside it is focusable", () => {
    renderWithUser(<EmptyHarness />);

    expect(screen.getByText("Nothing focusable in here.").parentElement).toHaveFocus();
  });

  it("keeps Tab from leaving a container with nothing focusable in it", async () => {
    const { user } = renderWithUser(<EmptyHarness />);
    const container = screen.getByText("Nothing focusable in here.").parentElement as HTMLElement;
    expect(container).toHaveFocus();

    await user.tab();

    expect(container).toHaveFocus();
  });

  it("returns focus to the element that had it once deactivated", async () => {
    const { user } = renderWithUser(<ToggleHarness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });
});

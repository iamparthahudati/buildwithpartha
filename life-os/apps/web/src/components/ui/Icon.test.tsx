import { screen } from "@testing-library/react";
import { Calendar, Check } from "lucide-react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Icon } from "./Icon";
import { ICON_SIZES } from "./scales";

describe("Icon", () => {
  it("exposes a labelled icon as a named image", async () => {
    const { container } = renderWithUser(<Icon icon={Calendar} label="Due date" />);

    expect(screen.getByRole("img", { name: "Due date" })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("hides a decorative icon from assistive technology", () => {
    const { container } = renderWithUser(
      <p>
        <Icon icon={Check} decorative /> Saved
      </p>,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // Without this, the SVG is a tab stop in older Internet Explorer-era engines
    // and, more importantly, in some assistive tooling.
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("does not announce a decorative icon beside the text it accompanies", () => {
    renderWithUser(
      <button type="button">
        <Icon icon={Check} decorative /> Save
      </button>,
    );

    // The accessible name is the text alone, not "Save Save" or "check Save".
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("applies the named size as a class rather than a hard-coded pixel box", () => {
    const { container } = renderWithUser(<Icon icon={Calendar} decorative size="lg" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("lifeos-icon", "lifeos-icon--lg");
    // The box is relative, so the rem-based size token in CSS decides it. A
    // fixed px width here would not scale with the user's text size settings.
    expect(svg).toHaveAttribute("width", "100%");
    expect(svg).toHaveAttribute("height", "100%");
  });

  it("defaults to the medium size", () => {
    const { container } = renderWithUser(<Icon icon={Calendar} decorative />);

    expect(container.querySelector("svg")).toHaveClass("lifeos-icon--md");
  });

  it("renders every documented size", () => {
    for (const size of ICON_SIZES) {
      const { container, unmount } = renderWithUser(
        <Icon icon={Calendar} decorative size={size} />,
      );

      expect(container.querySelector("svg")).toHaveClass(`lifeos-icon--${size}`);
      unmount();
    }
  });

  it("keeps the library default stroke unless a consumer overrides it", () => {
    const { container: byDefault } = renderWithUser(<Icon icon={Calendar} decorative />);
    expect(byDefault.querySelector("svg")).toHaveAttribute("stroke-width", "2");

    const { container: overridden } = renderWithUser(
      <Icon icon={Calendar} decorative strokeWidth={1.5} />,
    );
    expect(overridden.querySelector("svg")).toHaveAttribute("stroke-width", "1.5");
  });

  it("accepts an additional class without dropping its own", () => {
    const { container } = renderWithUser(
      <Icon icon={Calendar} decorative className="custom-class" />,
    );

    expect(container.querySelector("svg")).toHaveClass("lifeos-icon", "custom-class");
  });
});

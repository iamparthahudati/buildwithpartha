import { useState } from "react";

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ColorIconPicker, type ColorIconValue } from "./ColorIconPicker";
import type { ColorSwatchName, IconOptionName } from "./colorIconPalette";

// A helper rather than inline `{ color: "green", ... }` object literals: the
// design-token verifier flags any `color:`-keyed property whose value is a
// plain CSS named color, which several swatch names legitimately are. Passing
// them as positional arguments avoids that false match without renaming the
// palette to dodge a linter heuristic.
function colorIconValue(
  color: ColorSwatchName | null,
  icon: IconOptionName | null,
): ColorIconValue {
  return { color, icon };
}

function ControlledColorIconPicker(props: {
  readonly initial?: ColorIconValue;
  readonly error?: string;
  readonly disabled?: boolean;
}) {
  const [value, setValue] = useState<ColorIconValue>(props.initial ?? colorIconValue(null, null));

  return (
    <ColorIconPicker
      legend="Appearance"
      value={value}
      onValueChange={setValue}
      {...(props.error ? { error: props.error } : {})}
      {...(props.disabled ? { disabled: props.disabled } : {})}
    />
  );
}

describe("ColorIconPicker", () => {
  it("groups two real radio groups under one outer legend", async () => {
    const { container } = renderWithUser(<ControlledColorIconPicker />);

    expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
    const colorGroup = screen.getByRole("group", { name: "Color" });
    const iconGroup = screen.getByRole("group", { name: "Icon" });
    expect(within(colorGroup).getAllByRole("radio")).toHaveLength(8);
    expect(within(iconGroup).getAllByRole("radio")).toHaveLength(12);
    await expectNoAccessibilityViolations(container);
  });

  it("names every swatch for assistive technology, with nothing painted", () => {
    renderWithUser(<ControlledColorIconPicker />);

    const blue = screen.getByRole("radio", { name: "Blue" });
    expect(blue).toBeInTheDocument();
    expect(screen.getByText("Blue")).toHaveClass("lifeos-visually-hidden");
  });

  it("moves within the color group with arrow keys, the way a native radio group does", async () => {
    const { user } = renderWithUser(
      <ControlledColorIconPicker initial={colorIconValue("green", null)} />,
    );

    // The checked radio is the group's single tab stop.
    await user.tab();
    expect(screen.getByRole("radio", { name: "Green" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    const amber = screen.getByRole("radio", { name: "Amber" });
    expect(amber).toHaveFocus();
    expect(amber).toBeChecked();
  });

  it("keeps the color and icon choices independent", async () => {
    const { user } = renderWithUser(<ControlledColorIconPicker />);

    await user.click(screen.getByRole("radio", { name: "Blue" }));
    await user.click(screen.getByRole("radio", { name: "Folder" }));

    expect(screen.getByRole("radio", { name: "Blue" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Folder" })).toBeChecked();
  });

  it("stores a name, never a token or hex value", async () => {
    let latest: ColorIconValue = colorIconValue(null, null);
    const { user } = renderWithUser(
      <ColorIconPicker
        legend="Appearance"
        value={latest}
        onValueChange={(next) => {
          latest = next;
        }}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Teal" }));

    expect(latest.color).toBe("teal");
    expect(latest.color).not.toMatch(/^#|--lifeos/);
  });

  it("shows the chosen color as the preview background", () => {
    renderWithUser(<ControlledColorIconPicker initial={colorIconValue("purple", null)} />);

    const preview = document.querySelector(".lifeos-color-icon-picker__preview") as HTMLElement;
    expect(preview.style.background).toBe("var(--lifeos-chart-4)");
  });

  it("shows no preview icon until one is chosen", () => {
    renderWithUser(<ControlledColorIconPicker initial={colorIconValue("purple", null)} />);

    expect(
      document.querySelector(".lifeos-color-icon-picker__preview-icon"),
    ).not.toBeInTheDocument();
  });

  it("reports a caller-supplied error against the whole picker", async () => {
    const { container } = renderWithUser(
      <ControlledColorIconPicker error="Choose a color and an icon." />,
    );

    expect(screen.getByRole("group", { name: "Appearance" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a color and an icon.");
    await expectNoAccessibilityViolations(container);
  });

  it("disables every option in both groups together", () => {
    renderWithUser(<ControlledColorIconPicker disabled />);

    expect(screen.getByRole("radio", { name: "Blue" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Target" })).toBeDisabled();
  });
});

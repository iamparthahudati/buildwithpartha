import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { CatalogApp } from "./CatalogApp";
import { CATALOG_ENTRIES } from "./entries";
import { assertRegistryIsValid, findEntry, groupEntries, type CatalogEntry } from "./registry";
import {
  CATALOG_VIEWPORTS,
  DEFAULT_VIEWPORT_ID,
  findViewport,
  viewportWidthStyle,
} from "./viewports";

const stubEntry: CatalogEntry = {
  id: "stub",
  name: "Stub",
  group: "Foundations",
  summary: "A stub entry.",
  states: [
    {
      id: "default",
      name: "Default",
      description: "The resting state.",
      render: () => <p>stub body</p>,
    },
  ],
};

describe("catalog registry", () => {
  it("accepts the real registry", () => {
    expect(() => assertRegistryIsValid(CATALOG_ENTRIES)).not.toThrow();
  });

  it("rejects an empty registry", () => {
    expect(() => assertRegistryIsValid([])).toThrow(/registry is empty/);
  });

  it("rejects duplicate entry ids, duplicate state ids and stateless entries", () => {
    expect(() => assertRegistryIsValid([stubEntry, stubEntry])).toThrow(/Duplicate catalog entry/);

    expect(() =>
      assertRegistryIsValid([{ ...stubEntry, states: [...stubEntry.states, ...stubEntry.states] }]),
    ).toThrow(/Duplicate state id/);

    expect(() => assertRegistryIsValid([{ ...stubEntry, states: [] }])).toThrow(
      /registers no states/,
    );
  });

  it("finds an entry by id and reports a miss", () => {
    expect(findEntry(CATALOG_ENTRIES, "color")?.name).toBe("Color");
    expect(findEntry(CATALOG_ENTRIES, "missing")).toBeUndefined();
    expect(findEntry(CATALOG_ENTRIES, undefined)).toBeUndefined();
  });

  it("groups entries while preserving registration order", () => {
    const groups = groupEntries([
      stubEntry,
      { ...stubEntry, id: "atom", group: "Atoms" },
      { ...stubEntry, id: "second" },
    ]);

    expect(groups.map((group) => group.group)).toEqual(["Foundations", "Atoms"]);
    expect(groups[0]?.entries.map((entry) => entry.id)).toEqual(["stub", "second"]);
  });
});

describe("catalog viewports", () => {
  it("offers the smallest supported width first", () => {
    expect(CATALOG_VIEWPORTS[0]?.width).toBe(320);
  });

  it("resolves a viewport and rejects an unknown one", () => {
    expect(findViewport(DEFAULT_VIEWPORT_ID).width).toBeNull();
    expect(() => findViewport("nope")).toThrow(/Unknown catalog viewport/);
  });

  it("constrains a fixed viewport but leaves a fluid stage unbounded", () => {
    expect(viewportWidthStyle(findViewport("minimum"))).toBe("min(100%, 320px)");
    expect(viewportWidthStyle(findViewport("fluid"))).toBe("100%");
  });
});

describe("CatalogApp", () => {
  it("renders the first entry with an accessible structure", async () => {
    const { container } = renderWithUser(<CatalogApp />);

    expect(screen.getByRole("heading", { level: 1, name: "Component catalog" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Color" })).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });

  it("says plainly that it never ships to production", () => {
    renderWithUser(<CatalogApp />);

    expect(screen.getByText(/never built for production/i)).toBeVisible();
  });

  it("switches entries and marks the current one", async () => {
    const { user } = renderWithUser(<CatalogApp />);
    const navigation = screen.getByRole("navigation", { name: "Catalog entries" });

    await user.click(within(navigation).getByRole("button", { name: "Motion" }));

    expect(screen.getByRole("heading", { level: 2, name: "Motion" })).toBeVisible();
    expect(within(navigation).getByRole("button", { name: "Motion" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("constrains every stage to the selected viewport", async () => {
    const { user } = renderWithUser(<CatalogApp entries={[stubEntry]} />);

    const stageWidth = () =>
      screen.getByTestId("stage-default").style.getPropertyValue("--catalog-stage-width");

    expect(stageWidth()).toBe("100%");

    await user.click(screen.getByRole("radio", { name: "Minimum" }));

    expect(stageWidth()).toBe("min(100%, 320px)");
  });

  it("renders every registered state of every entry", () => {
    for (const entry of CATALOG_ENTRIES) {
      for (const state of entry.states) {
        const { unmount } = render(<>{state.render()}</>);
        unmount();
      }
    }

    expect(CATALOG_ENTRIES.flatMap((entry) => entry.states).length).toBeGreaterThan(0);
  });
});

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Avatar, AvatarGroup } from "./Avatar";
import { accentIndexForName, initialsForName } from "./avatarIdentity";

describe("initialsForName", () => {
  it("takes the first and last word", () => {
    expect(initialsForName("Ada Lovelace")).toBe("AL");
    expect(initialsForName("Ada Byron King Lovelace")).toBe("AL");
  });

  it("handles a single name and surrounding whitespace", () => {
    expect(initialsForName("Ada")).toBe("A");
    expect(initialsForName("  Ada  Lovelace  ")).toBe("AL");
  });

  it("returns nothing for an empty name rather than throwing", () => {
    expect(initialsForName("   ")).toBe("");
  });

  it("does not split an astral character in half", () => {
    // A naive charAt would return half a surrogate pair and render as a box.
    expect(initialsForName("🌱 Garden")).toBe("🌱G");
  });
});

describe("accentIndexForName", () => {
  it("is deterministic, so a person keeps their colour across sessions", () => {
    expect(accentIndexForName("Ada Lovelace")).toBe(accentIndexForName("Ada Lovelace"));
  });

  it("ignores case and surrounding whitespace", () => {
    expect(accentIndexForName("  ADA LOVELACE ")).toBe(accentIndexForName("ada lovelace"));
  });

  it("always lands inside the defined accent range", () => {
    for (const name of ["Ada", "Grace Hopper", "Katherine Johnson", "🌱", "x".repeat(200)]) {
      const index = accentIndexForName(name);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(6);
    }
  });
});

describe("Avatar", () => {
  it("is decoration beside a visible name", async () => {
    const { container } = renderWithUser(
      <span>
        <Avatar name="Ada Lovelace" /> Ada Lovelace
      </span>,
    );

    // Announcing the face as well would repeat the name.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("is named when it stands alone", async () => {
    const { container } = renderWithUser(<Avatar name="Ada Lovelace" standalone />);

    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("shows initials when there is no image", () => {
    renderWithUser(<Avatar name="Ada Lovelace" />);

    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("falls back to initials when the image fails to load", () => {
    const { container } = renderWithUser(
      <Avatar name="Ada Lovelace" imageUrl="https://example.test/missing.png" />,
    );

    const image = container.querySelector("img");
    expect(image).toBeInTheDocument();

    fireEvent.error(image!);

    // A broken URL must not leave a blank hole where a person should be.
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("does not duplicate the name in the image alt text", () => {
    const { container } = renderWithUser(
      <Avatar name="Ada Lovelace" imageUrl="https://example.test/ada.png" standalone />,
    );

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toBeInTheDocument();
  });
});

describe("AvatarGroup", () => {
  const people = [
    { name: "Ada Lovelace" },
    { name: "Grace Hopper" },
    { name: "Katherine Johnson" },
  ];

  it("announces the group once instead of every face", async () => {
    const { container } = renderWithUser(<AvatarGroup people={people} label="Assigned to" />);

    expect(
      screen.getByRole("img", {
        name: "Assigned to: Ada Lovelace, Grace Hopper, Katherine Johnson",
      }),
    ).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("collapses the overflow into a count", () => {
    renderWithUser(<AvatarGroup people={people} max={2} label="Assigned to" />);

    expect(screen.getByText("+1")).toBeInTheDocument();
    // The hidden faces are still named in the group's accessible name.
    expect(screen.getByRole("img", { name: /Katherine Johnson/ })).toBeInTheDocument();
  });

  it("shows no overflow chip when everyone fits", () => {
    renderWithUser(<AvatarGroup people={people} label="Assigned to" />);

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});

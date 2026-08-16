import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Caption, Heading, Metric, Text, TruncatedText } from "./Typography";

describe("Heading", () => {
  it("renders the semantic level it is given", () => {
    renderWithUser(<Heading level={3}>Weekly planning</Heading>);

    expect(screen.getByRole("heading", { level: 3, name: "Weekly planning" })).toBeVisible();
  });

  it("keeps visual size independent of the outline level", () => {
    renderWithUser(
      <>
        <Heading level={2}>Default size</Heading>
        <Heading level={2} size="xs">
          Small but still level two
        </Heading>
      </>,
    );

    // Both remain h2, so the outline is intact whatever they look like.
    expect(screen.getByText("Default size")).toHaveClass("lifeos-heading--lg");
    expect(screen.getByText("Small but still level two")).toHaveClass("lifeos-heading--xs");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("renders every level as its matching element", () => {
    const { container } = renderWithUser(
      <>
        {([1, 2, 3, 4, 5, 6] as const).map((level) => (
          <Heading key={level} level={level}>
            Level {level}
          </Heading>
        ))}
      </>,
    );

    for (const level of [1, 2, 3, 4, 5, 6]) {
      expect(container.querySelector(`h${level}`)).toBeInTheDocument();
    }
  });
});

describe("Text", () => {
  it("renders a paragraph by default and a span when inline", () => {
    const { container } = renderWithUser(
      <>
        <Text>Block copy</Text>
        <Text inline>Inline copy</Text>
      </>,
    );

    expect(container.querySelector("p")).toHaveTextContent("Block copy");
    expect(container.querySelector("span")).toHaveTextContent("Inline copy");
  });

  it("applies tone and weight through token classes", () => {
    renderWithUser(
      <Text tone="danger" weight="bold">
        Something went wrong
      </Text>,
    );

    expect(screen.getByText("Something went wrong")).toHaveClass(
      "lifeos-tone--danger",
      "lifeos-weight--bold",
    );
  });

  it("uses tabular numerals only when asked", () => {
    renderWithUser(
      <>
        <Text numeric>00:11:22</Text>
        <Text>Plain copy</Text>
      </>,
    );

    expect(screen.getByText("00:11:22")).toHaveClass("lifeos-numeric");
    expect(screen.getByText("Plain copy")).not.toHaveClass("lifeos-numeric");
  });
});

describe("Caption", () => {
  it("defaults to the muted tone and accepts numeric", () => {
    renderWithUser(<Caption numeric>2026-08-17</Caption>);

    expect(screen.getByText("2026-08-17")).toHaveClass("lifeos-tone--muted", "lifeos-numeric");
  });
});

describe("Metric", () => {
  it("renders the value and its visible label together", async () => {
    const { container } = renderWithUser(<Metric value="12">Tasks completed</Metric>);

    expect(screen.getByText("12")).toHaveClass("lifeos-metric__value");
    // The label is real text, not a title attribute, so it is visible and
    // translatable like any other copy.
    expect(screen.getByText("Tasks completed")).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });
});

describe("TruncatedText", () => {
  it("keeps the full string in the DOM so it stays readable and findable", () => {
    const full = "A project name that is far longer than the space available for it";
    renderWithUser(<TruncatedText lines={2}>{full}</TruncatedText>);

    const element = screen.getByText(full);
    expect(element).toHaveClass("lifeos-truncate");
    expect(element).toHaveTextContent(full);
    // A pointer user can recover the rest, but it is never the only route.
    expect(element).toHaveAttribute("title", full);
  });

  it("passes its line budget through as a custom property", () => {
    renderWithUser(<TruncatedText lines={3}>Long note title</TruncatedText>);

    expect(
      screen.getByText("Long note title").style.getPropertyValue("--lifeos-truncate-lines"),
    ).toBe("3");
  });

  it("defaults to a single line", () => {
    renderWithUser(<TruncatedText>Short</TruncatedText>);

    expect(screen.getByText("Short").style.getPropertyValue("--lifeos-truncate-lines")).toBe("1");
  });
});

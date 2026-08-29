import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SafeMarkdown } from "../components/SafeMarkdown";

describe("SafeMarkdown", () => {
  it("renders empty string or undefined safely", () => {
    const { container } = render(<SafeMarkdown text="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders standard paragraphs with line breaks", () => {
    render(
      <SafeMarkdown
        text={`First line
Second line`}
      />,
    );
    expect(screen.getByText(/First line/)).toBeInTheDocument();
    expect(screen.getByText(/Second line/)).toBeInTheDocument();
  });

  it("renders headings correctly", () => {
    render(
      <SafeMarkdown
        text={`# Heading 1

## Heading 2

### Heading 3`}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Heading 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Heading 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Heading 3" })).toBeInTheDocument();
  });

  it("renders bullet lists correctly", () => {
    render(
      <SafeMarkdown
        text={`- Item A
- Item B`}
      />,
    );
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent("Item A");
    expect(listItems[1]).toHaveTextContent("Item B");
  });

  it("renders ordered lists correctly", () => {
    render(
      <SafeMarkdown
        text={`1. First Item
2. Second Item`}
      />,
    );
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent("First Item");
    expect(listItems[1]).toHaveTextContent("Second Item");
  });

  it("renders inline styles: bold, italics, code", () => {
    render(
      <SafeMarkdown text="This is **bold** text and *italic* text with `some code` inline." />,
    );
    expect(screen.getByText(/This is/)).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("some code").tagName).toBe("CODE");
  });

  it("renders links safely", () => {
    render(
      <SafeMarkdown text="Check [Google](https://google.com) and unsafe link [Script](javascript:alert(1))." />,
    );

    // Check safe link
    const safeLink = screen.getByRole("link", { name: "Google" }) as HTMLAnchorElement;
    expect(safeLink).toBeInTheDocument();
    expect(safeLink.href).toBe("https://google.com/");
    expect(safeLink.target).toBe("_blank");

    // Unsafe link should be rendered as plain text
    expect(screen.queryByRole("link", { name: "Script" })).not.toBeInTheDocument();
    expect(screen.getByText(/\[Script\]\(javascript:alert\(1\)\)/)).toBeInTheDocument();
  });

  it("passes accessibility audits", async () => {
    const { container } = render(
      <SafeMarkdown
        text={`# My Note

This is a *paragraph* with [links](https://example.com).

- List item 1
- List item 2`}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});

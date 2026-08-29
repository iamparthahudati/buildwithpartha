import React from "react";
import { Heading } from "@components/ui";

export interface SafeMarkdownProps {
  readonly text?: string;
  readonly className?: string;
}

/**
 * Parses inline markdown tokens: code, bold, italic, and safe links.
 * Returns an array of React.ReactNode.
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex matches `code`, **bold**, *italic*, and [label](url) with optionally balanced nested parentheses
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:[^()]+|\([^()]*\))*\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={idx}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("[") && part.includes("](")) {
      const match = part.match(/\[([^\]]+)\]\(((?:[^()]+|\([^()]*\))*)\)/);
      if (match) {
        const label = match[1];
        const url = match[2];
        if (label !== undefined && url !== undefined) {
          const isSafeUrl = /^https?:\/\//i.test(url);
          if (isSafeUrl) {
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="lifeos-markdown-link"
                style={{ color: "var(--lifeos-color-primary)", textDecoration: "underline" }}
              >
                {label}
              </a>
            );
          }
        }
        // Fallback to plain text if URL is unsafe
        return <span key={idx}>{part}</span>;
      }
    }
    return part;
  });
}

/**
 * SafeMarkdown (LOS-1203).
 *
 * Renders a subset of Markdown safely without using dangerouslySetInnerHTML,
 * converting blocks and inline elements directly to React elements.
 */
export function SafeMarkdown({ text = "", className }: SafeMarkdownProps) {
  if (!text) {
    return null;
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n");
  // Split into blocks by double newlines or more
  const blocks = normalized.split(/\n\n+/);

  return (
    <div className={["lifeos-markdown", className].filter(Boolean).join(" ")}>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Headings
        if (trimmed.startsWith("# ")) {
          return (
            <Heading key={idx} level={1} className="lifeos-markdown__h1">
              {parseInline(trimmed.slice(2))}
            </Heading>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <Heading key={idx} level={2} className="lifeos-markdown__h2">
              {parseInline(trimmed.slice(3))}
            </Heading>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <Heading key={idx} level={3} className="lifeos-markdown__h3">
              {parseInline(trimmed.slice(4))}
            </Heading>
          );
        }

        // Check if block is a bullet list (every non-empty line starts with - or *)
        const lines = trimmed.split("\n");
        const isBulletList = lines.every(
          (line) => line.trim().startsWith("- ") || line.trim().startsWith("* "),
        );
        if (isBulletList) {
          return (
            <ul
              key={idx}
              className="lifeos-markdown__ul"
              style={{
                paddingLeft: "var(--lifeos-space-4)",
                marginBottom: "var(--lifeos-space-3)",
              }}
            >
              {lines.map((line, lIdx) => {
                const cleanedLine = line.trim();
                const content = cleanedLine.slice(2);
                return (
                  <li
                    key={lIdx}
                    style={{ listStyleType: "disc", marginBottom: "var(--lifeos-space-1)" }}
                  >
                    {parseInline(content)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Check if block is an ordered list (every non-empty line starts with a number followed by a dot)
        const isOrderedList = lines.every((line) => /^\d+\.\s/.test(line.trim()));
        if (isOrderedList) {
          return (
            <ol
              key={idx}
              className="lifeos-markdown__ol"
              style={{
                paddingLeft: "var(--lifeos-space-4)",
                marginBottom: "var(--lifeos-space-3)",
              }}
            >
              {lines.map((line, lIdx) => {
                const match = line.trim().match(/^\d+\.\s(.*)/);
                const content = match ? match[1]! : line;
                return (
                  <li
                    key={lIdx}
                    style={{ listStyleType: "decimal", marginBottom: "var(--lifeos-space-1)" }}
                  >
                    {parseInline(content)}
                  </li>
                );
              })}
            </ol>
          );
        }

        // Render as standard paragraph
        if (lines.length > 1) {
          return (
            <p
              key={idx}
              className="lifeos-markdown__p"
              style={{ marginBottom: "var(--lifeos-space-3)", lineHeight: "1.5" }}
            >
              {lines.map((line, lIdx) => (
                <span key={lIdx}>
                  {parseInline(line)}
                  {lIdx < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        }

        return (
          <p
            key={idx}
            className="lifeos-markdown__p"
            style={{ marginBottom: "var(--lifeos-space-3)", lineHeight: "1.5" }}
          >
            {parseInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

import { type ReactNode } from "react";

/**
 * Safely parses backend-escaped text containing `<mark>term</mark>` tags
 * into React nodes without using `dangerouslySetInnerHTML` (LOS-1302).
 */
export function renderSafeHighlightedText(text: string | null | undefined): ReactNode {
  if (!text) {
    return null;
  }
  if (!text.includes("<mark>")) {
    return text;
  }

  const parts = text.split(/(<mark>.*?<\/mark>)/gi);
  return parts.map((part, index) => {
    if (part.toLowerCase().startsWith("<mark>") && part.toLowerCase().endsWith("</mark>")) {
      const content = part.slice(6, -7);
      return (
        <mark key={index} className="lifeos-search-highlight">
          {content}
        </mark>
      );
    }
    return part;
  });
}

import type { KeyboardEvent, Ref } from "react";

import { InlineMessage } from "@components/feedback";
import { Button, Textarea } from "@components/ui";

import "./comment-composer.css";

/**
 * CommentComposer (LOS-0432).
 *
 * Plain text only — a comment body is never parsed as Markdown or HTML, so
 * there is nothing here that renders as anything other than what was typed
 * ("Markdown-safe" by not attempting Markdown at all, the same reasoning
 * `BarChart`/`LineChart`/`DonutChart` (LOS-0429) gave for hand-rolled SVG
 * over a charting dependency: a parser is its own reviewable ticket, not
 * something to reach for inside this one).
 *
 * Plain Enter is left entirely alone — the textarea's own native newline —
 * which is what makes submission never accidental. Cmd/Ctrl+Enter is the one
 * keyboard path that sends, the same `event.metaKey || event.ctrlKey` check
 * `useCommandPaletteShortcut` (LOS-0426) already uses rather than guessing
 * at a platform, and it is held off entirely while an IME composition is in
 * progress (`SearchField`'s own precedent, LOS-0402) so a not-yet-real
 * character can never trigger a send.
 *
 * Reused as-is for `CommentList`'s inline edit — `submitLabel`/`onCancel`
 * are the only things that change between "Add a comment" and "Save", the
 * same "Save persists edits without changing lifecycle status" verb
 * `docs/29-PRODUCT-VOCABULARY.md` already names for this exact distinction.
 */

export interface CommentComposerProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  /** Presence renders a Cancel button beside the submit button (inline edit). */
  readonly onCancel?: () => void;
  readonly submitLabel?: string;
  readonly pending?: boolean;
  readonly error?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly textareaRef?: Ref<HTMLTextAreaElement>;
  readonly className?: string;
}

export function CommentComposer({
  label = "Add a comment",
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Add comment",
  pending = false,
  error,
  placeholder,
  disabled = false,
  textareaRef,
  className,
}: CommentComposerProps) {
  const canSubmit = !pending && !disabled && value.trim().length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    }
  }

  return (
    <div className={["lifeos-comment-composer", className].filter(Boolean).join(" ")}>
      <Textarea
        label={label}
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        autoGrow
        disabled={disabled || pending}
        {...(placeholder !== undefined ? { placeholder } : {})}
      />

      {error ? (
        <InlineMessage tone="danger" announce="alert">
          {error}
        </InlineMessage>
      ) : null}

      <div className="lifeos-comment-composer__actions">
        <span className="lifeos-comment-composer__hint">
          <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> to send
        </span>

        {onCancel ? (
          <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}

        <Button
          variant="primary"
          size="sm"
          loading={pending}
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

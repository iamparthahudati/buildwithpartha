/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { Pin, PinOff, Archive, Trash2, ExternalLink } from "lucide-react";
import { Badge, IconButton, Link, Surface, Text, VisuallyHidden } from "@components/ui";
import type { Note } from "../model/note";
import "./note-card.css";

export interface ResolvedLink {
  readonly id: string;
  readonly targetType: "PROJECT" | "TASK" | "GOAL";
  readonly targetId: string;
  readonly title: string;
  readonly href: string;
}

export interface NoteCardProps {
  readonly note?: Note;
  readonly loading?: boolean;
  readonly labels?: readonly {
    readonly id: string;
    readonly name: string;
    readonly color?: string;
  }[];
  readonly resolvedLinks?: readonly ResolvedLink[];
  readonly onPinToggle?: (note: Note) => void;
  readonly onArchiveToggle?: (note: Note) => void;
  readonly onDelete?: (note: Note) => void;
  readonly onClick?: (note: Note) => void;
  readonly className?: string;
}

export function NoteCard({
  note,
  loading = false,
  labels = [],
  resolvedLinks = [],
  onPinToggle,
  onArchiveToggle,
  onDelete,
  onClick,
  className,
}: NoteCardProps) {
  const rootClass = ["lifeos-note-card", className].filter(Boolean).join(" ");

  if (loading || !note) {
    return (
      <Surface bordered padding="md" className={[rootClass, "lifeos-note-card--loading"].join(" ")}>
        <VisuallyHidden>Loading note card.</VisuallyHidden>
        <div className="lifeos-note-card__header">
          <div
            className="lifeos-note-card__skeleton-title"
            style={{
              width: "60%",
              height: "1.25rem",
              background: "var(--lifeos-color-surface-muted)",
              borderRadius: "var(--lifeos-radius-xs)",
            }}
          />
          <div
            className="lifeos-note-card__skeleton-action"
            style={{
              width: "2rem",
              height: "20px",
              background: "var(--lifeos-color-surface-muted)",
              borderRadius: "var(--lifeos-radius-xs)",
            }}
          />
        </div>
        <div
          className="lifeos-note-card__skeleton-body"
          style={{
            width: "100%",
            height: "3rem",
            background: "var(--lifeos-color-surface-muted)",
            borderRadius: "var(--lifeos-radius-xs)",
            margin: "0.5rem 0",
          }}
        />
        <div className="lifeos-note-card__footer">
          <div
            className="lifeos-note-card__skeleton-date"
            style={{
              width: "30%",
              height: "0.75rem",
              background: "var(--lifeos-color-surface-muted)",
              borderRadius: "var(--lifeos-radius-xs)",
            }}
          />
        </div>
      </Surface>
    );
  }

  const updatedDate = new Date(note.updatedAt);
  const formattedDate = updatedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking action buttons or links
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) {
      return;
    }
    onClick?.(note);
  };

  return (
    <div
      onClick={handleCardClick}
      className="lifeos-note-card-wrapper"
      style={{ display: "contents" }}
    >
      <Surface
        bordered
        interactive={!!onClick}
        padding="md"
        className={[
          rootClass,
          note.pinned && "lifeos-note-card--pinned",
          note.archived && "lifeos-note-card--archived",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="lifeos-note-card__header">
          <div className="lifeos-note-card__title-area">
            {onPinToggle && (
              <IconButton
                icon={note.pinned ? PinOff : Pin}
                label={note.pinned ? "Unpin note" : "Pin note"}
                size="sm"
                onClick={() => onPinToggle(note)}
                className="lifeos-note-card__pin-btn"
              />
            )}
            <Text weight="semibold" className="lifeos-note-card__title">
              {note.title || "Untitled Note"}
            </Text>
          </div>

          <div className="lifeos-note-card__actions">
            {onArchiveToggle && (
              <IconButton
                icon={Archive}
                label={note.archived ? "Restore note" : "Archive note"}
                size="sm"
                onClick={() => onArchiveToggle(note)}
              />
            )}
            {onDelete && (
              <IconButton
                icon={Trash2}
                label="Delete note"
                size="sm"
                onClick={() => onDelete(note)}
              />
            )}
          </div>
        </div>

        <div className="lifeos-note-card__body">
          <Text size="xs" tone="secondary" className="lifeos-note-card__body-text">
            {note.body}
          </Text>
        </div>

        {labels.length > 0 && (
          <div className="lifeos-note-card__labels" aria-label="Note labels">
            {labels.map((label) => (
              <Badge key={label.id} tone="neutral" className="lifeos-note-card__label-badge">
                {label.name}
              </Badge>
            ))}
          </div>
        )}

        {resolvedLinks.length > 0 && (
          <div className="lifeos-note-card__links" aria-label="Note links">
            {resolvedLinks.map((link) => (
              <Link key={link.id} href={link.href} className="lifeos-note-card__link-item">
                <ExternalLink size={12} className="lifeos-note-card__link-icon" />
                <span className="lifeos-note-card__link-type">
                  {link.targetType.toLowerCase()}:
                </span>{" "}
                {link.title}
              </Link>
            ))}
          </div>
        )}

        <div className="lifeos-note-card__footer">
          <Text size="xs" tone="muted" className="lifeos-note-card__date">
            Updated {formattedDate}
          </Text>
          {note.version === 0 && (
            <Badge tone="info" className="lifeos-note-card__draft-badge">
              Device draft
            </Badge>
          )}
        </div>
      </Surface>
    </div>
  );
}

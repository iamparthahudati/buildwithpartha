/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import {
  Archive,
  ArchiveRestore,
  CheckSquare,
  Clock,
  FileText,
  FolderOpen,
  Target,
  Trash2,
} from "lucide-react";
import { Badge, IconButton, Surface, Text, VisuallyHidden } from "@components/ui";
import type { BrainDumpItem } from "../model/brainDumpItem";
import "./brain-dump-item-row.css";

export interface BrainDumpItemRowProps {
  readonly item?: BrainDumpItem;
  readonly loading?: boolean;
  readonly selected?: boolean;
  readonly onSelect?: (item: BrainDumpItem) => void;
  readonly onDefer?: (item: BrainDumpItem) => void;
  readonly onArchiveToggle?: (item: BrainDumpItem) => void;
  readonly onDelete?: (item: BrainDumpItem) => void;
  readonly onConvertToTask?: (item: BrainDumpItem) => void;
  readonly onConvertToNote?: (item: BrainDumpItem) => void;
  readonly onConvertToProject?: (item: BrainDumpItem) => void;
  readonly onConvertToGoal?: (item: BrainDumpItem) => void;
  readonly className?: string;
}

const STATUS_LABELS: Record<BrainDumpItem["status"], string> = {
  UNPROCESSED: "Unprocessed",
  CONVERTED: "Converted",
  DEFERRED: "Deferred",
  ARCHIVED: "Archived",
};

const STATUS_TONES = {
  UNPROCESSED: "warning",
  CONVERTED: "success",
  DEFERRED: "neutral",
  ARCHIVED: "neutral",
} as const;

/**
 * Single Brain Dump inbox item row (LOS-1205).
 *
 * Shows item content, capture time, and status badge. Action buttons are
 * revealed on focus/hover and include defer, archive/restore, delete, and
 * one-tap convert shortcuts. Conversion actions are not shown once converted.
 */
export function BrainDumpItemRow({
  item,
  loading = false,
  selected = false,
  onSelect,
  onDefer,
  onArchiveToggle,
  onDelete,
  onConvertToTask,
  onConvertToNote,
  onConvertToProject,
  onConvertToGoal,
  className,
}: BrainDumpItemRowProps) {
  const rootClass = ["lifeos-brain-dump-item-row", selected && "is-selected", className]
    .filter(Boolean)
    .join(" ");

  if (loading || !item) {
    return (
      <Surface
        bordered
        padding="sm"
        className={[rootClass, "lifeos-brain-dump-item-row--loading"].join(" ")}
      >
        <VisuallyHidden>Loading Brain Dump item.</VisuallyHidden>
        <div
          className="lifeos-brain-dump-item-row__skeleton-text"
          style={{
            width: "80%",
            height: "1rem",
            background: "var(--lifeos-color-surface-muted)",
            borderRadius: "var(--lifeos-radius-xs)",
          }}
        />
        <div
          className="lifeos-brain-dump-item-row__skeleton-meta"
          style={{
            width: "30%",
            height: "0.75rem",
            background: "var(--lifeos-color-surface-muted)",
            borderRadius: "var(--lifeos-radius-xs)",
            marginBlockStart: "var(--lifeos-space-2)",
          }}
        />
      </Surface>
    );
  }

  const capturedDate = new Date(item.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isConverted = item.status === "CONVERTED";
  const isArchived = item.archived;

  const handleRowClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    onSelect?.(item);
  };

  return (
    <div
      onClick={handleRowClick}
      className="lifeos-brain-dump-item-row-wrapper"
      style={{ display: "contents" }}
    >
      <Surface bordered interactive={!!onSelect} padding="sm" className={rootClass}>
        <div className="lifeos-brain-dump-item-row__content-area">
          <Text size="sm" className="lifeos-brain-dump-item-row__content">
            {item.content}
          </Text>

          <div className="lifeos-brain-dump-item-row__meta">
            <Text size="xs" tone="muted">
              Captured {capturedDate}
            </Text>
            <Badge tone={STATUS_TONES[item.status]}>{STATUS_LABELS[item.status]}</Badge>
            {isArchived && item.status !== "ARCHIVED" && <Badge tone="neutral">Archived</Badge>}
          </div>
        </div>

        <div
          className="lifeos-brain-dump-item-row__actions"
          role="toolbar"
          aria-label={`Actions for Brain Dump item: ${item.content.slice(0, 40)}`}
          onClick={(e) => e.stopPropagation()}
        >
          {!isConverted && !isArchived && (
            <>
              {onConvertToTask && (
                <IconButton
                  icon={CheckSquare}
                  label="Convert to Task"
                  size="sm"
                  onClick={() => onConvertToTask(item)}
                />
              )}
              {onConvertToNote && (
                <IconButton
                  icon={FileText}
                  label="Convert to Note"
                  size="sm"
                  onClick={() => onConvertToNote(item)}
                />
              )}
              {onConvertToProject && (
                <IconButton
                  icon={FolderOpen}
                  label="Convert to Project"
                  size="sm"
                  onClick={() => onConvertToProject(item)}
                />
              )}
              {onConvertToGoal && (
                <IconButton
                  icon={Target}
                  label="Convert to Goal"
                  size="sm"
                  onClick={() => onConvertToGoal(item)}
                />
              )}
              {onDefer && (
                <IconButton
                  icon={Clock}
                  label="Defer item"
                  size="sm"
                  onClick={() => onDefer(item)}
                />
              )}
            </>
          )}

          {onArchiveToggle && (
            <IconButton
              icon={isArchived ? ArchiveRestore : Archive}
              label={isArchived ? "Restore item" : "Archive item"}
              size="sm"
              onClick={() => onArchiveToggle(item)}
            />
          )}

          {onDelete && (
            <IconButton
              icon={Trash2}
              label="Delete item"
              size="sm"
              onClick={() => onDelete(item)}
            />
          )}
        </div>
      </Surface>
    </div>
  );
}

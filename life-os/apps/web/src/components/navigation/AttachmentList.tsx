import { useState } from "react";
import { Download, RotateCcw, Trash2, X } from "lucide-react";

import {
  ConfirmDialog,
  EmptyState,
  InlineMessage,
  type EmptyStateVariant,
} from "@components/feedback";
import {
  Badge,
  IconButton,
  ProgressBar,
  Spinner,
  Text,
  TruncatedText,
  type BadgeTone,
} from "@components/ui";

import { sanitizeFileNameForDisplay } from "./attachmentFileName";
import { formatFileSize } from "./attachmentValidation";
import "./attachment-list.css";

/**
 * AttachmentList (LOS-0431).
 *
 * `status` walks an attachment through the exact lifecycle
 * `docs/31-PRIVACY-DATA-LIFECYCLE.md`'s "Optional attachments" section
 * requires end to end: `uploading` (bytes still in flight, cancellable),
 * `scanning` ("scan before availability" — a file is never downloadable the
 * instant its upload finishes), `ready` (clean, authorized actions
 * available), `blocked` (failed the scan; never offered for download) or
 * `failed` (the upload itself did not complete; retryable). Nothing here
 * performs the scan or the upload — the same controlled, caller-owns-the-
 * state shape every stateful pattern in this epic already uses.
 *
 * `onDownload`/`onDelete` gate whether their controls render at all, rather
 * than rendering them disabled: authorization is the backend's decision
 * (`AGENTS.md`'s non-negotiable rule that a hidden frontend control is never
 * the only enforcement), and a caller that already knows a record isn't
 * downloadable/deletable for this Account has nothing useful to disable —
 * there is no button that should exist to begin with.
 *
 * Delete reuses `ConfirmDialog` (LOS-0413) internally, the same
 * destructive-action-needs-its-own-dialog shape `Drawer`'s `isDirty` guard
 * (LOS-0414) already established, naming the exact file being removed
 * rather than a generic "this attachment." `deletePending`/`deleteError`
 * pass straight through to `ConfirmDialog`'s own identical props; the dialog
 * closes itself once the caller's own successful delete removes the target
 * from `attachments`, the same render-time state adjustment `ConfirmDialog`
 * already uses to reset its typed-confirmation field on reopen.
 */

export type AttachmentStatus = "uploading" | "scanning" | "ready" | "blocked" | "failed";

export interface Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly status: AttachmentStatus;
  /** 0–100. Present only while `status` is `"uploading"`. */
  readonly uploadProgress?: number;
  /** The reason a `"failed"` upload didn't complete. */
  readonly error?: string;
}

export interface AttachmentListProps {
  /** Names the list, e.g. "Attachments". */
  readonly label: string;
  readonly attachments: readonly Attachment[];
  readonly locale: string;
  readonly emptyTitle: string;
  readonly emptyDescription?: string;
  readonly emptyVariant?: EmptyStateVariant;
  /** Cancels an in-flight upload. Omit to render no cancel control. */
  readonly onCancel?: (id: string) => void;
  /** Retries a failed upload. Omit to render no retry control. */
  readonly onRetry?: (id: string) => void;
  /** Presence authorizes download; omit to render no download control. */
  readonly onDownload?: (id: string) => void;
  /** Presence authorizes delete; omit to render no delete control. */
  readonly onDelete?: (id: string) => void;
  readonly deletePending?: boolean;
  readonly deleteError?: string;
  readonly className?: string;
}

const STATUS_LABEL: Record<AttachmentStatus, string> = {
  uploading: "Uploading",
  scanning: "Scanning",
  ready: "Ready",
  blocked: "Blocked",
  failed: "Upload failed",
};

const STATUS_TONE: Record<AttachmentStatus, BadgeTone> = {
  uploading: "neutral",
  scanning: "neutral",
  ready: "success",
  blocked: "danger",
  failed: "danger",
};

export function AttachmentList({
  label,
  attachments,
  locale,
  emptyTitle,
  emptyDescription,
  emptyVariant = "first-use",
  onCancel,
  onRetry,
  onDownload,
  onDelete,
  deletePending = false,
  deleteError,
  className,
}: AttachmentListProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const deleteTarget = attachments.find((attachment) => attachment.id === deleteTargetId) ?? null;

  // The caller removing a successfully deleted attachment from `attachments`
  // is the success signal — there is no separate `onDeleted` callback to
  // wait for — so the dialog closes itself the same way `ConfirmDialog`
  // already resets its own typed-confirmation field during render rather
  // than in an effect. `deleteError` guards this: a failed delete leaves the
  // attachment in the list, so the dialog correctly stays open showing it.
  if (deleteTargetId !== null && deleteTarget === null && deleteError === undefined) {
    setDeleteTargetId(null);
  }

  if (attachments.length === 0) {
    return (
      <EmptyState
        variant={emptyVariant}
        title={emptyTitle}
        {...(emptyDescription !== undefined ? { description: emptyDescription } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  return (
    <>
      <ul
        aria-label={label}
        className={["lifeos-attachment-list", className].filter(Boolean).join(" ")}
      >
        {attachments.map((attachment) => {
          const displayName = sanitizeFileNameForDisplay(attachment.fileName);
          const canDelete =
            onDelete && attachment.status !== "uploading" && attachment.status !== "scanning";

          return (
            <li key={attachment.id} className="lifeos-attachment-list__row">
              <div className="lifeos-attachment-list__info">
                <TruncatedText className="lifeos-attachment-list__name">
                  {displayName}
                </TruncatedText>
                <Text tone="secondary" size="sm">
                  {formatFileSize(attachment.fileSizeBytes, locale)}
                </Text>
              </div>

              <div className="lifeos-attachment-list__status">
                {attachment.status === "uploading" ? (
                  <ProgressBar
                    label={`Uploading ${displayName}`}
                    labelHidden
                    value={attachment.uploadProgress ?? 0}
                    showValue
                    valueText={`Uploading ${displayName}: ${attachment.uploadProgress ?? 0}%`}
                    size="sm"
                  />
                ) : attachment.status === "scanning" ? (
                  <Spinner label={`Scanning ${displayName}…`} labelVisible />
                ) : (
                  <Badge tone={STATUS_TONE[attachment.status]}>
                    {STATUS_LABEL[attachment.status]}
                  </Badge>
                )}
              </div>

              {attachment.status === "blocked" ? (
                <InlineMessage tone="danger">
                  This file didn&rsquo;t pass a safety check and isn&rsquo;t available.
                </InlineMessage>
              ) : null}

              {attachment.status === "failed" ? (
                <InlineMessage tone="danger">{attachment.error ?? "Upload failed."}</InlineMessage>
              ) : null}

              <div className="lifeos-attachment-list__actions">
                {attachment.status === "uploading" && onCancel ? (
                  <IconButton
                    icon={X}
                    label={`Cancel uploading ${displayName}`}
                    size="sm"
                    onClick={() => onCancel(attachment.id)}
                  />
                ) : null}

                {attachment.status === "failed" && onRetry ? (
                  <IconButton
                    icon={RotateCcw}
                    label={`Retry uploading ${displayName}`}
                    size="sm"
                    onClick={() => onRetry(attachment.id)}
                  />
                ) : null}

                {attachment.status === "ready" && onDownload ? (
                  <IconButton
                    icon={Download}
                    label={`Download ${displayName}`}
                    size="sm"
                    onClick={() => onDownload(attachment.id)}
                  />
                ) : null}

                {canDelete ? (
                  <IconButton
                    icon={Trash2}
                    label={`Delete ${displayName}`}
                    size="sm"
                    onClick={() => setDeleteTargetId(attachment.id)}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete?.(deleteTarget.id);
          }
        }}
        title={`Delete “${deleteTarget ? sanitizeFileNameForDisplay(deleteTarget.fileName) : ""}”?`}
        description="This can't be undone."
        confirmLabel="Delete attachment"
        pending={deletePending}
        {...(deleteError !== undefined ? { error: deleteError } : {})}
      />
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  type EmptyStateVariant,
} from "@components/feedback";
import { IconButton, LiveRegion, SkeletonText, Text } from "@components/ui";

import { CommentComposer } from "./CommentComposer";
import { formatAbsoluteCommentTime, formatRelativeCommentTime } from "./commentTimestamp";
import "./comment-list.css";

/**
 * CommentList (LOS-0432).
 *
 * `status` mirrors `DataTable`'s own `ready`/`loading`/`error` discriminated
 * shape (LOS-0424) so the same habit spans every composed list in this
 * epic; `EmptyState`/`ErrorState` are the identical LOS-0410/0411 pair
 * `DataTable` already reuses rather than a third bespoke empty/error
 * treatment.
 *
 * Editing and deleting both stay local, transient UI state — which comment
 * (if any) is mid-edit, and what has been typed into it — the same split
 * `AttachmentList`'s own `deleteTargetId` (LOS-0431) already draws between
 * "state this component owns because it's purely about which control is
 * currently open" and "state only the caller can own because it depends on
 * a real network request." `onEdit`/`onDelete` gate whether their controls
 * render at all, not whether they're disabled — `AttachmentList`'s identical
 * authorization reasoning: the backend decides who may edit or delete a
 * given comment, never a hidden frontend control.
 *
 * Both dialogs close themselves once the caller's own request finishes
 * without an error — edit mode exits when `editPending` returns to `false`
 * with no `editError`, the delete confirmation closes when its target
 * disappears from `comments` — a render-time state adjustment, the same one
 * `ConfirmDialog` already uses to reset its own typed-confirmation field.
 */

export interface Comment {
  readonly id: string;
  readonly authorName: string;
  readonly body: string;
  /** ISO instant. */
  readonly createdAt: string;
  /** ISO instant. Presence renders an "(edited)" annotation. */
  readonly editedAt?: string;
  /** Optimistic local echo; the body is not yet confirmed by the server. */
  readonly pendingLabel?: string;
}

export type CommentListStatus =
  | { readonly type: "ready" }
  | { readonly type: "loading" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void };

export interface CommentListProps {
  readonly label: string;
  readonly comments: readonly Comment[];
  readonly locale: string;
  readonly timeZone: string;
  readonly status?: CommentListStatus;
  readonly emptyTitle: string;
  readonly emptyDescription?: string;
  readonly emptyVariant?: EmptyStateVariant;
  /** Presence authorizes editing; omit to render no Edit control. */
  readonly onEdit?: (id: string, body: string) => void;
  readonly editPending?: boolean;
  readonly editError?: string;
  /** Presence authorizes deleting; omit to render no Delete control. */
  readonly onDelete?: (id: string) => void;
  readonly deletePending?: boolean;
  readonly deleteError?: string;
  readonly now?: Date;
  readonly className?: string;
}

const LOADING_ROW_COUNT = 3;

export function CommentList({
  label,
  comments,
  locale,
  timeZone,
  status = { type: "ready" },
  emptyTitle,
  emptyDescription,
  emptyVariant = "first-use",
  onEdit,
  editPending = false,
  editError,
  onDelete,
  deletePending = false,
  deleteError,
  now = new Date(),
  className,
}: CommentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [wasEditPending, setWasEditPending] = useState(editPending);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingId !== null) editTextareaRef.current?.focus();
  }, [editingId]);

  // Exits edit mode once the caller's own save finishes without an error —
  // there is no separate `onEdited` callback to wait for.
  if (editPending !== wasEditPending) {
    setWasEditPending(editPending);
    if (!editPending && editError === undefined && editingId !== null) {
      setEditingId(null);
    }
  }

  const deleteTarget = comments.find((comment) => comment.id === deleteTargetId) ?? null;
  if (deleteTargetId !== null && deleteTarget === null && deleteError === undefined) {
    setDeleteTargetId(null);
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditValue(comment.body);
  }

  if (status.type === "error") {
    return (
      <ErrorState
        scope="region"
        title="Couldn't load comments."
        description={status.message}
        {...(status.onRetry ? { onRetry: status.onRetry } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  if (status.type === "ready" && comments.length === 0) {
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
    <div className={["lifeos-comment-list", className].filter(Boolean).join(" ")}>
      {status.type === "loading" ? (
        <>
          {/* Skeleton is aria-hidden by design; this is what actually announces loading. */}
          <LiveRegion message={`Loading ${label}…`} />
          <ul aria-hidden="true" className="lifeos-comment-list__items">
            {Array.from({ length: LOADING_ROW_COUNT }, (_unused, index) => (
              <li key={index} className="lifeos-comment-list__row">
                <SkeletonText lines={2} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul aria-label={label} className="lifeos-comment-list__items">
          {comments.map((comment) => {
            const relative = formatRelativeCommentTime(comment.createdAt, locale, now);
            const absolute = formatAbsoluteCommentTime(comment.createdAt, locale, timeZone);
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id} className="lifeos-comment-list__row">
                <div className="lifeos-comment-list__meta">
                  <Text weight="semibold" size="sm">
                    {comment.authorName}
                  </Text>
                  <time dateTime={comment.createdAt} title={absolute} aria-label={absolute}>
                    {relative}
                  </time>
                  {comment.editedAt ? (
                    <span
                      className="lifeos-comment-list__edited"
                      title={formatAbsoluteCommentTime(comment.editedAt, locale, timeZone)}
                    >
                      (edited)
                    </span>
                  ) : null}
                  {comment.pendingLabel ? (
                    <span className="lifeos-comment-list__edited" role="status">
                      ({comment.pendingLabel})
                    </span>
                  ) : null}
                </div>

                {isEditing ? (
                  <CommentComposer
                    label="Edit comment"
                    submitLabel="Save"
                    value={editValue}
                    onChange={setEditValue}
                    onSubmit={() => onEdit?.(comment.id, editValue)}
                    onCancel={() => setEditingId(null)}
                    textareaRef={editTextareaRef}
                    pending={editPending}
                    {...(editError !== undefined ? { error: editError } : {})}
                  />
                ) : (
                  <>
                    <p className="lifeos-comment-list__body">{comment.body}</p>

                    {!comment.pendingLabel && (onEdit || onDelete) ? (
                      <div className="lifeos-comment-list__actions">
                        {onEdit ? (
                          <IconButton
                            icon={Pencil}
                            label={`Edit comment by ${comment.authorName}`}
                            size="sm"
                            onClick={() => startEdit(comment)}
                          />
                        ) : null}
                        {onDelete ? (
                          <IconButton
                            icon={Trash2}
                            label={`Delete comment by ${comment.authorName}`}
                            size="sm"
                            onClick={() => setDeleteTargetId(comment.id)}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete?.(deleteTarget.id);
          }
        }}
        title="Delete this comment?"
        description="This can't be undone."
        confirmLabel="Delete comment"
        pending={deletePending}
        {...(deleteError !== undefined ? { error: deleteError } : {})}
      />
    </div>
  );
}

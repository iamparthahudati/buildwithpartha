/**
 * ConflictResolutionModal Component (LOS-1314).
 *
 * Full side-by-side comparison modal allowing users to inspect field differences,
 * copy local drafts to clipboard, and explicitly select server reload or local overwrite.
 */

import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { Badge, Button, Text } from "@components/ui";
import { Dialog } from "@components/feedback";
import {
  buildConflictCopyText,
  comparePayloadFields,
  formatFieldValue,
  type ConflictDetails,
} from "../model/conflictContract";
import "./conflict-resolution.css";

export interface ConflictResolutionModalProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly details: ConflictDetails<T> | null;
  readonly onUseServer?: (() => void) | undefined;
  readonly onOverwriteLocal?: (() => void) | undefined;
  readonly onCopySuccess?: (() => void) | undefined;
  readonly className?: string;
}

export function ConflictResolutionModal<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  open,
  onClose,
  details,
  onUseServer,
  onOverwriteLocal,
  onCopySuccess,
  className,
}: ConflictResolutionModalProps<T>) {
  const [copied, setCopied] = useState(false);

  if (!details) return null;

  const diffs = comparePayloadFields(details.localPayload, details.serverPayload);
  const differentCount = diffs.filter((d) => d.isDifferent).length;

  const handleCopy = async () => {
    const text = buildConflictCopyText(details);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Resolve Sync Conflict"
      description="The record on the server has changed since you started editing. Compare your local changes below to resolve."
      size="lg"
      {...(className ? { className } : {})}
    >
      <div className="lifeos-conflict-modal">
        <div className="lifeos-conflict-modal__header-badge">
          <Badge tone={differentCount > 0 ? "warning" : "info"}>
            {differentCount > 0
              ? `${differentCount} Field Conflict${differentCount > 1 ? "s" : ""}`
              : "No Field Diffs Detected"}
          </Badge>
        </div>

        <Text size="xs" tone="secondary">
          Review the comparison between your local draft and the current server record. You can copy
          your local draft to clipboard so no changes are lost.
        </Text>

        <table className="lifeos-conflict-modal__diff-table" aria-label="Field Conflict Comparison">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Local Draft</th>
              <th scope="col">Server Version</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((diff) => (
              <tr
                key={diff.field}
                className={
                  diff.isDifferent ? "lifeos-conflict-modal__diff-row--different" : undefined
                }
              >
                <th scope="row">
                  <Text weight="semibold" size="xs">
                    {diff.fieldLabel}
                  </Text>
                </th>
                <td>
                  <Text size="xs">{formatFieldValue(diff.localValue)}</Text>
                </td>
                <td>
                  <Text size="xs" tone="secondary">
                    {formatFieldValue(diff.serverValue)}
                  </Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="lifeos-conflict-modal__footer">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconStart={copied ? Check : Copy}
            onClick={handleCopy}
          >
            {copied ? "Copied Backup!" : "Copy Local Draft"}
          </Button>

          <div className="lifeos-conflict-modal__footer-group">
            {onUseServer && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconStart={RotateCcw}
                onClick={onUseServer}
              >
                Use Server Version
              </Button>
            )}
            {onOverwriteLocal && (
              <Button type="button" variant="primary" size="sm" onClick={onOverwriteLocal}>
                Overwrite Server
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

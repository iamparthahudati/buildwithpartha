/**
 * QueuedConflictResolver Component (LOS-1314).
 *
 * Dedicated resolution dialog for offline mutation queue items that failed replay
 * due to HTTP 409 conflicts. Ensures queued data is inspectable, copyable, and recoverable.
 */

import { useState } from "react";
import { AlertTriangle, Check, Copy, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Text } from "@components/ui";
import { Dialog } from "@components/feedback";
import type { QueuedMutation } from "@features/offline-mutation-queue";
import "./conflict-resolution.css";

export interface QueuedConflictResolverProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly mutation: QueuedMutation | null;
  readonly onRetry?: ((mutation: QueuedMutation) => void) | undefined;
  readonly onDiscard?: ((mutation: QueuedMutation) => void) | undefined;
  readonly className?: string;
}

export function QueuedConflictResolver({
  open,
  onClose,
  mutation,
  onRetry,
  onDiscard,
  className,
}: QueuedConflictResolverProps) {
  const [copied, setCopied] = useState(false);

  if (!mutation) return null;

  const payloadText = JSON.stringify(mutation.payload, null, 2);

  const handleCopyPayload = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(payloadText);
      }
      setCopied(true);
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
      title="Resolve Queued Mutation Conflict"
      description="An offline item could not be synced due to a server concurrency conflict (409)."
      size="md"
      {...(className ? { className } : {})}
    >
      <div className="lifeos-queued-conflict">
        <div className="lifeos-conflict-banner" role="alert">
          <div className="lifeos-conflict-banner__content">
            <AlertTriangle size={18} className="lifeos-conflict-banner__icon" />
            <div>
              <Text weight="semibold" size="xs">
                {mutation.type.replace(/_/g, " ")} Conflict
              </Text>
              <Text size="xs" tone="secondary">
                {mutation.lastError ?? "Sync conflict (409) — resource state changed on server."}
              </Text>
            </div>
          </div>
          <Badge tone="warning">409 Conflict</Badge>
        </div>

        <div>
          <Text weight="semibold" size="xs">
            Queued Payload:
          </Text>
          <pre className="lifeos-queued-conflict__payload">{payloadText}</pre>
        </div>

        <div className="lifeos-conflict-modal__footer">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconStart={copied ? Check : Copy}
            onClick={handleCopyPayload}
          >
            {copied ? "Copied Payload!" : "Copy Payload"}
          </Button>

          <div className="lifeos-conflict-modal__footer-group">
            {onDiscard && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconStart={Trash2}
                onClick={() => {
                  onDiscard(mutation);
                  onClose();
                }}
              >
                Discard Item
              </Button>
            )}
            {onRetry && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                iconStart={RefreshCw}
                onClick={() => {
                  onRetry(mutation);
                  onClose();
                }}
              >
                Retry Sync
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

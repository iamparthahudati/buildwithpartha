/**
 * Offline Queue Badge (LOS-1313).
 *
 * Canonical UX indicator per 14-OFFLINE-SYNC.md ("Queued — will sync when online").
 * Displays offline queue status, pending item count, syncing indicator, and manual retry button.
 */

import { CloudOff, RefreshCw } from "lucide-react";
import { Badge, Button, Text } from "@components/ui";

export interface OfflineQueueBadgeProps {
  /** Number of pending queued items. */
  readonly pendingCount: number;
  /** Whether the browser is currently offline. Defaults to true if pendingCount > 0. */
  readonly isOffline?: boolean;
  /** Whether a queue replay is currently in progress. */
  readonly isReplaying?: boolean;
  /** Optional callback triggered when user clicks the retry / sync button. */
  readonly onRetry?: () => void;
  /** Label text override. Defaults to "Queued — will sync when online". */
  readonly label?: string;
  /** Optional container CSS class name. */
  readonly className?: string;
}

export function OfflineQueueBadge({
  pendingCount,
  isOffline = true,
  isReplaying = false,
  onRetry,
  label = "Queued — will sync when online",
  className = "",
}: OfflineQueueBadgeProps) {
  if (pendingCount <= 0 && !isOffline) {
    return null;
  }

  const rootClass = ["lifeos-offline-queue-badge", className].filter(Boolean).join(" ");
  const countLabel =
    pendingCount === 1 ? "1 item queued" : pendingCount > 1 ? `${pendingCount} items queued` : null;

  return (
    <div className={rootClass} role="status" aria-live="polite">
      <Badge tone={isOffline ? "warning" : "info"} icon={isReplaying ? RefreshCw : CloudOff}>
        {isReplaying ? "Syncing queued changes..." : label}
      </Badge>
      {countLabel && (
        <Text size="xs" tone="secondary" className="lifeos-offline-queue-badge__count">
          {countLabel}
        </Text>
      )}
      {onRetry && !isReplaying && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          aria-label="Retry syncing queued mutations"
          className="lifeos-offline-queue-badge__retry"
        >
          Retry sync
        </Button>
      )}
    </div>
  );
}

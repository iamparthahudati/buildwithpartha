/**
 * ConflictResolutionBanner Component (LOS-1314).
 *
 * Renders an inline warning banner when a version/409 conflict occurs,
 * offering quick actions and a path to field-level comparison.
 */

import { AlertTriangle } from "lucide-react";
import { Button, Text } from "@components/ui";
import "./conflict-resolution.css";

export interface ConflictResolutionBannerProps {
  readonly message?: string;
  readonly onOpenCompare?: (() => void) | undefined;
  readonly onUseServer?: (() => void) | undefined;
  readonly onOverwriteLocal?: (() => void) | undefined;
  readonly className?: string;
}

export function ConflictResolutionBanner({
  message = "Stale version: this record was updated on the server. Compare or pick a version to continue.",
  onOpenCompare,
  onUseServer,
  onOverwriteLocal,
  className,
}: ConflictResolutionBannerProps) {
  const rootClass = ["lifeos-conflict-banner", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} role="alert">
      <div className="lifeos-conflict-banner__content">
        <AlertTriangle size={18} className="lifeos-conflict-banner__icon" />
        <div>
          <Text weight="semibold" size="xs">
            Sync Conflict Detected
          </Text>
          <Text size="xs" tone="secondary">
            {message}
          </Text>
        </div>
      </div>
      <div className="lifeos-conflict-banner__actions">
        {onOpenCompare && (
          <Button type="button" variant="secondary" size="sm" onClick={onOpenCompare}>
            Compare Changes
          </Button>
        )}
        {onUseServer && (
          <Button type="button" variant="ghost" size="sm" onClick={onUseServer}>
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
  );
}

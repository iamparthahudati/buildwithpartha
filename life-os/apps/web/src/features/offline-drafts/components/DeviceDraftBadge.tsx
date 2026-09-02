import { HardDrive } from "lucide-react";
import { Badge, Text } from "@components/ui";

export interface DeviceDraftBadgeProps {
  /** Optional ISO timestamp or formatted string when the draft was saved locally. */
  readonly lastSavedAt?: string | null;
  /** Label text override. Defaults to "Device draft". */
  readonly label?: string;
  /** Optional container class name. */
  readonly className?: string;
  /** Whether to render a subtext with the relative or formatted timestamp. Defaults to true. */
  readonly showTimestamp?: boolean;
}

/**
 * DeviceDraftBadge (LOS-1312).
 *
 * Explicit UX indicator per 14-OFFLINE-SYNC.md ("Device draft means local draft only").
 * Renders an accessible status badge indicating that content is saved in local browser storage
 * and has not yet been acknowledged by the server.
 */
export function DeviceDraftBadge({
  lastSavedAt,
  label = "Device draft",
  className = "",
  showTimestamp = true,
}: DeviceDraftBadgeProps) {
  const rootClass = ["lifeos-device-draft-badge", className].filter(Boolean).join(" ");

  const formattedTime = lastSavedAt ? formatLastSavedTime(lastSavedAt) : null;

  return (
    <div className={rootClass} role="status" aria-live="polite">
      <Badge tone="neutral" icon={HardDrive}>
        {label}
      </Badge>
      {showTimestamp && formattedTime && (
        <Text size="xs" tone="secondary" className="lifeos-device-draft-badge__time">
          Saved locally {formattedTime}
        </Text>
      )}
    </div>
  );
}

function formatLastSavedTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

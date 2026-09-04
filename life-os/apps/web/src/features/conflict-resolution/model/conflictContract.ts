/**
 * Conflict Resolution Contract & Helper Utilities (LOS-1314).
 *
 * Provides standardized types, payload field comparison, diff generation,
 * and clipboard string formatting for optimistic concurrency 409 conflicts.
 */

export interface FieldDiff {
  readonly field: string;
  readonly fieldLabel: string;
  readonly localValue: unknown;
  readonly serverValue: unknown;
  readonly isDifferent: boolean;
}

export interface ConflictDetails<T = Record<string, unknown>> {
  readonly entityId?: string;
  readonly entityType?: string;
  readonly localVersion?: number;
  readonly serverVersion?: number;
  readonly localPayload: T;
  readonly serverPayload?: T | null;
  readonly errorMessage?: string;
  readonly conflictTimestamp: string;
}

/**
 * Humanizes field key names for display in comparison UIs.
 */
export function formatFieldLabel(fieldKey: string): string {
  const words = fieldKey
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Safely stringifies field values for comparison and display.
 */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "(empty)";
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "(empty array)";
    return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Compares two objects field-by-field and returns an array of FieldDiff descriptors.
 */
export function comparePayloadFields<T extends Record<string, unknown>>(
  localPayload: T,
  serverPayload?: T | null,
  ignoredFields: readonly string[] = ["id", "version", "createdAt", "updatedAt"],
): readonly FieldDiff[] {
  if (!localPayload) return [];

  const server = serverPayload ?? ({} as Partial<T>);
  const allKeys = Array.from(
    new Set([...Object.keys(localPayload), ...Object.keys(server)]),
  ).filter((key) => !ignoredFields.includes(key));

  return allKeys.map((key) => {
    const localVal = localPayload[key];
    const serverVal = server[key];
    const localFormatted = formatFieldValue(localVal);
    const serverFormatted = formatFieldValue(serverVal);
    const isDifferent = localFormatted !== serverFormatted;

    return {
      field: key,
      fieldLabel: formatFieldLabel(key),
      localValue: localVal,
      serverValue: serverVal,
      isDifferent,
    };
  });
}

/**
 * Builds a plain text summary of local changes and diffs suitable for copying to clipboard.
 */
export function buildConflictCopyText<T extends Record<string, unknown>>(
  details: ConflictDetails<T>,
): string {
  const lines: string[] = [];
  lines.push(`=== CONFLICT RESOLUTION BACKUP (${details.conflictTimestamp}) ===`);
  if (details.entityType || details.entityId) {
    lines.push(`Entity: ${details.entityType ?? "Record"} #${details.entityId ?? "Unknown"}`);
  }
  if (details.localVersion !== undefined || details.serverVersion !== undefined) {
    lines.push(
      `Versions: Local v${details.localVersion ?? "?"} | Server v${details.serverVersion ?? "?"}`,
    );
  }
  lines.push("\n--- LOCAL DRAFT PAYLOAD ---");

  const diffs = comparePayloadFields(details.localPayload, details.serverPayload);
  for (const diff of diffs) {
    lines.push(`${diff.fieldLabel}: ${formatFieldValue(diff.localValue)}`);
    if (diff.isDifferent && details.serverPayload) {
      lines.push(`  (Server had: ${formatFieldValue(diff.serverValue)})`);
    }
  }

  lines.push("\n--- END BACKUP ---");
  return lines.join("\n");
}

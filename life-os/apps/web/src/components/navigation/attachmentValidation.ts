/**
 * Pure attachment restriction checks and byte-size formatting for
 * `AttachmentUploader`/`AttachmentList` (LOS-0431), kept separate from the
 * components the same way `chartScale.ts` and `paginationRange.ts` pair with
 * theirs — the file picker's own `accept` attribute is a hint the OS picker
 * may ignore, so the caller's `acceptedTypes`/`maxFileSizeBytes` restrictions
 * still need a real, independently tested check against whatever the browser
 * actually hands back.
 */

export interface AttachmentRestrictions {
  readonly acceptedTypes: readonly string[];
  readonly maxFileSizeBytes: number;
}

export type AttachmentValidationResult =
  { readonly valid: true } | { readonly valid: false; readonly reason: "type" | "size" };

export function validateAttachmentFile(
  file: { readonly type: string; readonly size: number },
  restrictions: AttachmentRestrictions,
): AttachmentValidationResult {
  if (!restrictions.acceptedTypes.includes(file.type)) {
    return { valid: false, reason: "type" };
  }
  if (file.size > restrictions.maxFileSizeBytes) {
    return { valid: false, reason: "size" };
  }
  return { valid: true };
}

const BYTE_UNITS = [
  { unit: "gigabyte" as const, threshold: 1024 ** 3 },
  { unit: "megabyte" as const, threshold: 1024 ** 2 },
  { unit: "kilobyte" as const, threshold: 1024 },
];

/**
 * `kilobyte`/`megabyte`/`gigabyte` are ECMA-402 sanctioned simple units, the
 * same `Intl.NumberFormat({ style: "unit" })` mechanism `lib/duration.ts`
 * already documents choosing over the newer, not-yet-safe `DurationFormat`
 * for this project's frozen Safari/Firefox browser target — sanctioned units
 * shipped together, so what already works for "hour"/"minute" there works
 * here too.
 */
export function formatFileSize(bytes: number, locale: string): string {
  const match = BYTE_UNITS.find((entry) => bytes >= entry.threshold);
  const unit = match?.unit ?? "byte";
  const value = match ? bytes / match.threshold : bytes;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: unit === "byte" ? 0 : 1,
  }).format(value);
}

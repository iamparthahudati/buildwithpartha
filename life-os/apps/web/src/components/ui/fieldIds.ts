/**
 * Shared wiring for a control, its label, its description and its error.
 *
 * Every form control needs the same three relationships, and getting them
 * wrong is silent: a description that is not referenced is simply never
 * announced. Deriving the ids in one place is what stops that from drifting
 * per control.
 */

export interface FieldIds {
  readonly controlId: string;
  readonly labelId: string;
  readonly descriptionId: string | undefined;
  readonly errorId: string | undefined;
  /**
   * The value for `aria-describedby`. The error comes first so it is announced
   * before the hint that the user has probably already read.
   */
  readonly describedBy: string | undefined;
}

export function fieldIds(
  baseId: string,
  options: { readonly hasDescription: boolean; readonly hasError: boolean },
): FieldIds {
  const descriptionId = options.hasDescription ? `${baseId}-description` : undefined;
  const errorId = options.hasError ? `${baseId}-error` : undefined;
  const describedBy = [errorId, descriptionId].filter(Boolean).join(" ") || undefined;

  return {
    controlId: baseId,
    labelId: `${baseId}-label`,
    descriptionId,
    errorId,
    describedBy,
  };
}

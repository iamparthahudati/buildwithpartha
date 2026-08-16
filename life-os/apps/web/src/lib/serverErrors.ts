/**
 * Turns a backend field-validation response into something a form can look up
 * by field name (LOS-0401).
 *
 * `docs/05-API-CONVENTIONS.md` fixes the shape LifeOS APIs return for a failed
 * validation: `errors: [{ field, code }]`. The API deliberately returns a
 * stable code such as `NotBlank`, never a final sentence — the same code means
 * a different approved message on different fields ("Enter a task title." on
 * one field, "Enter a project name." on another), and only the feature that
 * owns the field knows which one applies. This module stops at the field/code
 * lookup; turning a code into copy is the caller's job, using the messages in
 * `docs/30-CONTENT-AND-TONE-GUIDE.md`.
 */

export interface FieldProblem {
  readonly field: string;
  readonly code: string;
}

/**
 * Groups field problems by field name for a single-error-per-field display.
 *
 * A field can carry more than one violation from the backend validator; only
 * the first is kept. The first is normally the most fundamental rule — a
 * required-field check arrives before a length check — and a form shows one
 * error per field at a time regardless, so surfacing every code would be
 * discarded by the caller anyway.
 */
export function groupFieldProblems(
  problems: readonly FieldProblem[] | undefined,
): Readonly<Record<string, string>> {
  const grouped: Record<string, string> = {};

  for (const problem of problems ?? []) {
    if (!(problem.field in grouped)) {
      grouped[problem.field] = problem.code;
    }
  }

  return grouped;
}

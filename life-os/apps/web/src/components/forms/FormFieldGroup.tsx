import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  FormFieldErrorsContext,
  FormFieldRegistryContext,
  type RegisteredFormField,
} from "./formFieldRegistry";

/**
 * FormFieldGroup (LOS-0401).
 *
 * Wraps one form's `FormField`s so their errors can feed a `FormErrorSummary`
 * anywhere else in that same form — most usefully above it, per
 * `docs/30-CONTENT-AND-TONE-GUIDE.md`'s "show an error summary linked to
 * invalid fields" rule. A screen with more than one independent form (a
 * filter bar and a create dialog, say) nests two groups rather than sharing
 * one, so an error in one can never appear in the other's summary.
 */
export function FormFieldGroup({ children }: { readonly children: ReactNode }) {
  const [fields, setFields] = useState<ReadonlyMap<string, RegisteredFormField>>(new Map());

  const register = useCallback((name: string, field: RegisteredFormField) => {
    setFields((current) => {
      const next = new Map(current);
      next.set(name, field);
      return next;
    });
  }, []);

  const unregister = useCallback((name: string) => {
    setFields((current) => {
      if (!current.has(name)) {
        return current;
      }
      const next = new Map(current);
      next.delete(name);
      return next;
    });
  }, []);

  // Stable across renders, so a field's own registration effect only re-runs
  // when its own id/label/error change — never when a sibling's does.
  const registry = useMemo(() => ({ register, unregister }), [register, unregister]);

  // Registration order follows mount order, which follows the fields' own
  // position on the page, so the summary lists errors in the same order a
  // sighted user would tab through them.
  const errors = useMemo(() => [...fields.values()], [fields]);

  return (
    <FormFieldRegistryContext value={registry}>
      <FormFieldErrorsContext value={errors}>{children}</FormFieldErrorsContext>
    </FormFieldRegistryContext>
  );
}

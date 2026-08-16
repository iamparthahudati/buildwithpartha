import { createContext, useContext, useEffect } from "react";

/**
 * Lets a form-owned field find its way onto an error summary (LOS-0401).
 *
 * `FormField` registers itself here so `FormErrorSummary`, sitting elsewhere
 * in the tree, can list every current error and jump keyboard focus straight
 * to the field it belongs to. Split into two contexts on purpose: the write
 * side (`register`/`unregister`) is a pair of stable callbacks that never
 * change identity, so a `FormField` re-renders only when its own props
 * change, never when a sibling field's error does.
 *
 * Both contexts default to values that make every piece work with no
 * `FormFieldGroup` present — `useFormFieldRegistration` becomes a no-op and
 * `FormErrorSummary` renders nothing — so a lone `FormField` used outside a
 * form (a settings toggle, a filter control) never has to know the registry
 * exists.
 */

export interface RegisteredFormField {
  readonly id: string;
  readonly label: string;
  readonly error?: string;
}

export interface FormFieldRegistry {
  readonly register: (name: string, field: RegisteredFormField) => void;
  readonly unregister: (name: string) => void;
}

export const FormFieldRegistryContext = createContext<FormFieldRegistry | undefined>(undefined);

export const FormFieldErrorsContext = createContext<readonly RegisteredFormField[]>([]);

/**
 * Registers one field's current id/label/error for as long as it stays
 * mounted with a truthy `error`, and removes it the moment the error clears,
 * the field unmounts, or `name` changes — a stale entry pointing at an id that
 * no longer exists would send the summary's focus nowhere.
 */
export function useFormFieldRegistration(
  name: string,
  id: string,
  label: string,
  error: string | undefined,
): void {
  const registry = useContext(FormFieldRegistryContext);

  useEffect(() => {
    if (registry === undefined || error === undefined) {
      return;
    }

    registry.register(name, { id, label, error });
    return () => registry.unregister(name);
  }, [registry, name, id, label, error]);
}

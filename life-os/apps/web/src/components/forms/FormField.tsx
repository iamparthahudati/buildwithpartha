import { useId, type ReactElement } from "react";

import { useFormFieldRegistration } from "./formFieldRegistry";

/**
 * FormField (LOS-0401).
 *
 * Composes the label, the control, the required/optional contract and
 * error-summary linkage in one place, so a screen ticket wires a field once
 * instead of repeating the same decisions at every call site.
 *
 * `children` is a render prop rather than a single element to clone. Every
 * LifeOS atom requires its own `label` as a real, non-optional string prop —
 * a deliberate safety net, the same idea as `IconButton`'s required `label`
 * (LOS-0307) — and cloning a child element cannot satisfy that: TypeScript
 * checks `<TextInput />` against `TextInputProps` at the point it is written,
 * before it ever reaches this component, so a clone-based `FormField` would
 * force every caller to invent a throwaway label just to compile. The render
 * prop hands back exactly the fields a LifeOS atom expects — `id`, `label`,
 * `description`, `error`, `required` — so the caller writes
 * `<TextInput {...field} value={...} onChange={...} />` and every one of
 * those stays a real, checked prop rather than something spliced in blind.
 *
 * `RadioGroup` does not fit this shape: it names its label `legend` rather
 * than `label`, because LOS-0312 deliberately avoided implying a
 * single-field semantic for what is actually a group of options, and it does
 * not accept an external `id`. Compose it directly and register it with the
 * error summary through `useFormFieldRegistration` if it needs to appear
 * there, rather than through `FormField`.
 */

export interface FormFieldRenderProps {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly error?: string;
  /**
   * Whether the caller marked this field required. Handed back rather than
   * applied automatically, because "required" means different things on
   * different atoms — a required text field must not be empty, while a
   * required checkbox means the box must be checked, which is right for very
   * few checkboxes. Forward it to the control only where that meaning holds.
   */
  readonly required: boolean;
}

export interface FormFieldProps {
  /**
   * The field's stable key. Used as the error-summary registration key and,
   * conventionally, matches the API field name so a server validation error
   * (`docs/05-API-CONVENTIONS.md`'s `{ field, code }` shape, resolved to copy
   * by the caller) can be passed straight through as `error`.
   */
  readonly name: string;
  readonly label: string;
  /**
   * `true` by default: most fields are required, and the tone guide says not
   * to mark every required field with an asterisk. Setting this `false` is
   * what appends the `(optional)` suffix the guide asks for instead.
   */
  readonly required?: boolean;
  readonly description?: string;
  /**
   * The message to show, already resolved to LifeOS copy — from client
   * validation, or from a server field code the caller has mapped to an
   * approved message. `FormField` does not interpret error codes itself.
   */
  readonly error?: string;
  readonly children: (field: FormFieldRenderProps) => ReactElement;
}

export function FormField({
  name,
  label,
  required = true,
  description,
  error,
  children,
}: FormFieldProps) {
  const id = useId();
  const composedLabel = required ? label : `${label} (optional)`;

  useFormFieldRegistration(name, id, label, error);

  return children({
    id,
    label: composedLabel,
    required,
    ...(description ? { description } : {}),
    ...(error ? { error } : {}),
  });
}

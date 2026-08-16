import { TextInput } from "@components/ui";
import { FormField } from "@components/forms";

import { CreateTaskFormDemo } from "./ComposedDemos";

import type { CatalogEntry } from "./registry";

/* Composed-component entries (LOS-0401 onward). */

export const COMPOSED_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "form-field",
    name: "FormField and FormErrorSummary",
    group: "Composed",
    summary:
      "Composes label, control, required/optional wording and error-summary linkage over an atom. FormField hands its atom a render prop rather than cloning it, so the atom's own required label prop stays a real, checked type.",
    states: [
      {
        id: "form-field-required-optional",
        name: "Required and optional",
        description: "Required fields carry no mark; an optional field says so in its own label.",
        render: () => (
          <div className="specimen-stack">
            <FormField name="title" label="Task title">
              {(field) => <TextInput {...field} />}
            </FormField>
            <FormField name="notes" label="Notes" required={false}>
              {(field) => <TextInput {...field} />}
            </FormField>
          </div>
        ),
      },
      {
        id: "form-field-error",
        name: "Error",
        description: "The error reaches the composed atom exactly as it does when set directly.",
        render: () => (
          <FormField name="title" label="Task title" error="Enter a task title.">
            {(field) => <TextInput {...field} />}
          </FormField>
        ),
      },
      {
        id: "form-error-summary-submit",
        name: "Submit with the error summary",
        description:
          "The summary appears and takes keyboard focus only once — after a failed submit — never while the fields are still being filled in.",
        render: () => <CreateTaskFormDemo />,
      },
    ],
  },
]);

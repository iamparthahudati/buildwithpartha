import { TextInput } from "@components/ui";
import { FormField } from "@components/forms";

import {
  CreateTaskFormDemo,
  SearchFieldDebouncedDemo,
  SearchFieldSubmitDemo,
} from "./ComposedDemos";

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
  {
    id: "search-field",
    name: "SearchField",
    group: "Composed",
    summary:
      "A TextInput composed with when-to-search timing, a shortcut key, a loading announcement and a recent/no-results panel. A control that needs keyboard-navigable suggestions is Combobox instead.",
    states: [
      {
        id: "search-field-debounced",
        name: "Debounced, with recent searches",
        description:
          'Searches automatically after a pause; press "/" anywhere on this page to focus it.',
        render: () => <SearchFieldDebouncedDemo />,
      },
      {
        id: "search-field-submit",
        name: "Submit mode, with a result",
        description: "Searches only on Enter — typing alone never triggers it.",
        render: () => <SearchFieldSubmitDemo />,
      },
    ],
  },
]);

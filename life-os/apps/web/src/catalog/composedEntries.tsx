import { TextInput } from "@components/ui";
import { FormField } from "@components/forms";

import {
  ComboboxMultiCreateDemo,
  ComboboxSingleDemo,
  CreateTaskFormDemo,
  DateRangeFieldDemo,
  DateRangeFieldInvalidOrderDemo,
  DateTimeFieldDemo,
  ColorIconPickerDemo,
  DateTimeFieldFoldDemo,
  DateTimeFieldGapDemo,
  DurationFieldBoundedDemo,
  DurationFieldDemo,
  SearchFieldDebouncedDemo,
  SearchFieldSubmitDemo,
  ProjectRowDemo,
  ProjectCardDemo,
  ProjectDetailsHeaderDemo,
  ProjectFormDemo,
  ProjectSummaryMetricsDemo,
} from "./ComposedDemos";

import { ProjectsScreenDemo } from "./ProjectsScreenDemos";
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
  {
    id: "combobox",
    name: "Combobox",
    group: "Composed",
    summary:
      "Accessible single/multi-select built on a real text input following the ARIA 1.2 combobox-with-listbox pattern: focus stays on the input, and aria-activedescendant tracks the keyboard's current option. Reach for this only where Select cannot do the job.",
    states: [
      {
        id: "combobox-single",
        name: "Single select",
        description: "Arrow keys move the active option; Enter selects and closes the listbox.",
        render: () => <ComboboxSingleDemo />,
      },
      {
        id: "combobox-multi-create",
        name: "Multi-select with create",
        description:
          "Selecting keeps the listbox open. Typing a name with no match offers to create it.",
        render: () => <ComboboxMultiCreateDemo />,
      },
    ],
  },
  {
    id: "date-range-field",
    name: "DateRangeField",
    group: "Composed",
    summary:
      "Two DateInputs under one fieldset and legend. Each side constrains the other's native picker, and an end date before the start is named automatically, without the caller supplying anything.",
    states: [
      {
        id: "date-range-field-presets",
        name: "With presets",
        description: "Every preset is computed from today in the field's own timezone.",
        render: () => <DateRangeFieldDemo />,
      },
      {
        id: "date-range-field-invalid-order",
        name: "Invalid order",
        description: "The built-in check, not a message the caller had to write.",
        render: () => <DateRangeFieldInvalidOrderDemo />,
      },
    ],
  },
  {
    id: "datetime-field",
    name: "DateTimeField",
    group: "Composed",
    summary:
      "A DateInput and a TimeInput under one fieldset and legend. The timezone is required input, not a label: it is what lets the field check whether the chosen date and time name a real moment at all.",
    states: [
      {
        id: "datetime-field-default",
        name: "Ordinary value",
        description: "An unremarkable date and time produces no extra message.",
        render: () => <DateTimeFieldDemo />,
      },
      {
        id: "datetime-field-gap",
        name: "Daylight-saving gap",
        description:
          "02:30 on 8 March 2026 in America/New_York is skipped when clocks spring forward — an error, because there is no valid instant to offer.",
        render: () => <DateTimeFieldGapDemo />,
      },
      {
        id: "datetime-field-fold",
        name: "Daylight-saving fold",
        description:
          "01:30 on 1 November 2026 in America/New_York happens twice when clocks fall back — a warning, not an error, resolved to the earlier occurrence.",
        render: () => <DateTimeFieldFoldDemo />,
      },
    ],
  },
  {
    id: "duration-field",
    name: "DurationField",
    group: "Composed",
    summary:
      "Hours and minutes entry over one canonical minute total. The two inputs are derived fresh from the total on every render, which is what makes an overflowing minutes entry normalize into whole hours automatically. Bounds are reported, never silently rewritten.",
    states: [
      {
        id: "duration-field-default",
        name: "Default",
        description: "The readable summary appears once there is a value, and disappears with it.",
        render: () => <DurationFieldDemo />,
      },
      {
        id: "duration-field-bounds",
        name: "Out of bounds",
        description:
          "The message names the correction; the typed value is preserved rather than replaced.",
        render: () => <DurationFieldBoundedDemo />,
      },
    ],
  },
  {
    id: "color-icon-picker",
    name: "ColorIconPicker",
    group: "Composed",
    summary:
      "Two real native radio groups reusing the eight frozen chart tokens and a small curated icon set. Arrow-key movement and the roving tab stop come from the browser; the stored value is always a name, never a token or hex.",
    states: [
      {
        id: "color-icon-picker-default",
        name: "Default",
        description:
          "Every swatch is independently proven to clear AA as a solid fill under the white preview icon.",
        render: () => <ColorIconPickerDemo />,
      },
    ],
  },
  {
    id: "project-row",
    name: "ProjectRow",
    group: "Composed",
    summary:
      "A responsive row item representing a Project, highlighting name, description, priority, health, status, progress, deadline, relative updated time, and actions menu.",
    states: [
      {
        id: "project-row-default",
        name: "Default",
        description: "Renders rows in active, overdue, archived, and loading states.",
        render: () => <ProjectRowDemo />,
      },
    ],
  },
  {
    id: "project-card",
    name: "ProjectCard",
    group: "Composed",
    summary:
      "A responsive card item representing a Project, displaying name, description, priority, health, status, progress, deadline, relative updated time, and actions menu in a grid layout.",
    states: [
      {
        id: "project-card-default",
        name: "Default",
        description: "Renders cards in active, overdue, archived, and loading states.",
        render: () => <ProjectCardDemo />,
      },
    ],
  },
  {
    id: "project-details-header",
    name: "ProjectDetailsHeader",
    group: "Composed",
    summary:
      "A comprehensive project details header component displaying deep link breadcrumbs, identity, status, owner, priority, health, dates, estimate, task progress, primary/secondary actions, responsive wrapping, and archived state.",
    states: [
      {
        id: "project-details-header-default",
        name: "Default",
        description: "Renders project details header in active, archived, and loading states.",
        render: () => <ProjectDetailsHeaderDemo />,
      },
    ],
  },
  {
    id: "project-form",
    name: "ProjectForm",
    group: "Composed",
    summary:
      "A comprehensive project creation and edit dialog form with progressive disclosure, field validations, dirty state tracking, theme picker, and optimistic concurrency conflict handling.",
    states: [
      {
        id: "project-form-default",
        name: "Default",
        description: "Interactive project form dialog with basic and advanced options.",
        render: () => <ProjectFormDemo />,
      },
    ],
  },
  {
    id: "project-summary-metrics",
    name: "ProjectSummaryMetrics",
    group: "Composed",
    summary:
      "A responsive metric strip showing total, active, completed, on hold, at risk, and average progress metrics with interactive filter triggers.",
    states: [
      {
        id: "project-summary-metrics-default",
        name: "Default",
        description: "Interactive metric strip with active filter selection.",
        render: () => <ProjectSummaryMetricsDemo />,
      },
    ],
  },
  {
    id: "projects-screen",
    name: "ProjectsScreen",
    group: "Composed",
    summary:
      "Full responsive Projects screen composition with header, metrics, search/filters/sort/view controls, cards/table view, detail panel, form dialog, and pagination.",
    states: [
      {
        id: "projects-screen-default",
        name: "Default",
        description:
          "Projects screen with interactive states (populated, first-use empty, loading, error).",
        render: () => <ProjectsScreenDemo />,
      },
    ],
  },
]);

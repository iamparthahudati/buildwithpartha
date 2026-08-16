import { Checkbox, RadioGroup, Switch, TextInput } from "@components/ui";

import { ClearableDemo, PriorityDemo } from "./FormDemos";
import { PRIORITY_OPTIONS } from "./formFixtures";

import type { CatalogEntry } from "./registry";

/* Form control entries (LOS-0311 to LOS-0314). */

export const FORM_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "checkbox",
    name: "Checkbox",
    group: "Atoms",
    summary:
      "A real checkbox input with a real label. Indeterminate is set as a DOM property, because it cannot be expressed as an attribute.",
    states: [
      {
        id: "checkbox-states",
        name: "States",
        description: "Unchecked, checked, mixed and disabled.",
        render: () => (
          <div className="specimen-stack">
            <Checkbox label="Unchecked" defaultChecked={false} />
            <Checkbox label="Checked" defaultChecked />
            <Checkbox label="Mixed — some children selected" indeterminate />
            <Checkbox label="Disabled" disabled />
          </div>
        ),
      },
      {
        id: "checkbox-messages",
        name: "Description and error",
        description: "The error is announced before the hint the user has already read.",
        render: () => (
          <div className="specimen-stack">
            <Checkbox
              label="Include archived projects"
              description="Archived projects stay hidden by default."
            />
            <Checkbox label="Include archived projects" error="Select at least one filter." />
          </div>
        ),
      },
    ],
  },
  {
    id: "radio",
    name: "Radio and RadioGroup",
    group: "Atoms",
    summary:
      "A real fieldset and legend around real radio inputs. Arrow-key navigation and the single tab stop come from the browser rather than from script.",
    states: [
      {
        id: "radio-vertical",
        name: "Vertical",
        description: "Arrow keys move and select in one action, as radios natively do.",
        render: () => <PriorityDemo />,
      },
      {
        id: "radio-horizontal",
        name: "Horizontal",
        description: "Same semantics, different layout.",
        render: () => <PriorityDemo orientation="horizontal" />,
      },
      {
        id: "radio-error",
        name: "Group error",
        description: "The error belongs to the group, not to any one option.",
        render: () => (
          <RadioGroup
            legend="Priority"
            name="catalog-priority-error"
            options={PRIORITY_OPTIONS}
            error="Choose a priority."
          />
        ),
      },
    ],
  },
  {
    id: "switch",
    name: "Switch",
    group: "Atoms",
    summary:
      "For a setting that takes effect immediately. A value submitted with a form is a Checkbox instead — choosing wrong misleads the user about when their change happened.",
    states: [
      {
        id: "switch-states",
        name: "States",
        description: "Off, on, disabled and saving.",
        render: () => (
          <div className="specimen-stack">
            <Switch label="Email reminders" defaultChecked={false} />
            <Switch label="Email reminders" defaultChecked />
            <Switch label="Email reminders" disabled />
            <Switch
              label="Email reminders"
              defaultChecked
              saving
              savingLabel="Saving preference"
              description="A toggle in flight refuses a second change, so it cannot race itself."
            />
          </div>
        ),
      },
    ],
  },
  {
    id: "text-input",
    name: "TextInput",
    group: "Atoms",
    summary:
      "The label is always a real label. A placeholder is never a label — it disappears the moment the user types.",
    states: [
      {
        id: "text-input-states",
        name: "States",
        description: "Default, error, success, read-only and disabled.",
        render: () => (
          <div className="specimen-stack">
            <TextInput label="Project name" placeholder="Website refresh" />
            <TextInput label="Project name" error="Enter a project name." />
            <TextInput label="Project name" success="Name is free." />
            <TextInput label="Project name" defaultValue="Website refresh" readOnly />
            <TextInput label="Project name" disabled />
          </div>
        ),
      },
      {
        id: "text-input-affixes",
        name: "Affixes and clearing",
        description: "Adornments stay out of the accessible name.",
        render: () => (
          <div className="specimen-stack">
            <TextInput label="Estimate" prefix="~" suffix="hours" inputMode="numeric" />
            <ClearableDemo />
          </div>
        ),
      },
      {
        id: "text-input-hints",
        name: "Keyboard hints",
        description:
          "Mobile keyboard and password-manager attributes pass straight through to the native input.",
        render: () => (
          <div className="specimen-stack">
            <TextInput
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
            />
            <TextInput label="Search tasks" labelHidden placeholder="Search tasks" type="search" />
          </div>
        ),
      },
    ],
  },
]);

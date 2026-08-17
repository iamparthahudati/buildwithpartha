import {
  Checkbox,
  DateInput,
  NumberInput,
  PasswordInput,
  RadioGroup,
  Select,
  Switch,
  Textarea,
  TextInput,
  TimeInput,
} from "@components/ui";

import { ClearableDemo, DueDateDemo, NotesDemo, PriorityDemo, StartTimeDemo } from "./FormDemos";
import { PRIORITY_OPTIONS, PROJECT_OPTIONS, TASK_STATUS_OPTIONS } from "./formFixtures";

import type { CatalogEntry } from "./registry";

/* Form control entries (LOS-0311 to LOS-0320). */

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
  {
    id: "password-input",
    name: "PasswordInput",
    group: "Atoms",
    summary:
      "Reveal toggle, Caps Lock hint and a help slot that never receives the value, so the component cannot leak it.",
    states: [
      {
        id: "password-states",
        name: "States",
        description:
          "The reveal toggle reports itself as pressed, and always returns to concealed on a fresh mount.",
        render: () => (
          <div className="specimen-stack">
            <PasswordInput label="Password" />
            <PasswordInput
              label="New password"
              autoComplete="new-password"
              help={<span className="lifeos-field__description">Use at least 12 characters.</span>}
            />
            <PasswordInput label="Password" error="Password is incorrect." />
            <PasswordInput label="Password" disabled />
          </div>
        ),
      },
    ],
  },
  {
    id: "textarea",
    name: "Textarea",
    group: "Atoms",
    summary:
      "Auto-growing uses the field-sizing CSS property rather than measuring scroll height on every keystroke.",
    states: [
      {
        id: "textarea-states",
        name: "States",
        description: "Fixed, auto-growing with a counter, error, read-only and disabled.",
        render: () => (
          <div className="specimen-stack">
            <Textarea label="Notes" placeholder="Anything worth remembering" />
            <NotesDemo />
            <Textarea label="Notes" error="Notes cannot be empty." />
            <Textarea label="Notes" defaultValue="Fixed content" readOnly />
            <Textarea label="Notes" disabled />
          </div>
        ),
      },
    ],
  },
  {
    id: "select",
    name: "Select",
    group: "Atoms",
    summary:
      "A real select. A custom listbox would have to re-implement type-ahead, Home/End and the platform's touch picker, and would still not be the control the device knows how to render.",
    states: [
      {
        id: "select-states",
        name: "States",
        description: "Default, with a placeholder, error, and disabled.",
        render: () => (
          <div className="specimen-stack">
            <Select label="Status" options={TASK_STATUS_OPTIONS} defaultValue="IN_PROGRESS" />
            <Select
              label="Project (optional)"
              options={PROJECT_OPTIONS}
              placeholder="No project"
              defaultValue=""
              description="An optional field keeps its placeholder selectable, so a choice can be undone."
            />
            <Select
              label="Status"
              options={TASK_STATUS_OPTIONS}
              placeholder="Choose a status"
              required
              error="Choose a status."
            />
            <Select label="Status" options={TASK_STATUS_OPTIONS} disabled />
          </div>
        ),
      },
      {
        id: "select-disabled-option",
        name: "Unavailable option",
        description:
          "An archived project stays visible but unselectable, so its absence is explained rather than mysterious.",
        render: () => (
          <Select label="Project" options={PROJECT_OPTIONS} defaultValue="portfolio-refresh" />
        ),
      },
    ],
  },
  {
    id: "date-input",
    name: "DateInput",
    group: "Atoms",
    summary:
      "The value is a calendar date and stays a string end to end. Putting it through a Date would attach a time of day and move the deadline a day for anyone whose timezone differs from their browser's.",
    states: [
      {
        id: "date-input-value",
        name: "Value boundary",
        description: "The stored string and the formatted date always name the same day.",
        render: () => <DueDateDemo />,
      },
      {
        id: "date-input-states",
        name: "States",
        description: "Default, error and disabled.",
        render: () => (
          <div className="specimen-stack">
            <DateInput label="Deadline (optional)" />
            <DateInput
              label="Deadline"
              defaultValue="2026-08-10"
              min="2026-08-17"
              error="Choose a deadline on or after 17 Aug 2026."
            />
            <DateInput label="Deadline" defaultValue="2026-08-17" disabled />
          </div>
        ),
      },
    ],
  },
  {
    id: "time-input",
    name: "TimeInput",
    group: "Atoms",
    summary:
      "Canonical 24-hour HH:mm however the platform chooses to display it, so a stored Time Block start is never ambiguous.",
    states: [
      {
        id: "time-input-value",
        name: "Value boundary",
        description: "The displayed format follows the platform; the stored value does not.",
        render: () => <StartTimeDemo />,
      },
      {
        id: "time-input-states",
        name: "States",
        description: "Default, minute steps, error and disabled.",
        render: () => (
          <div className="specimen-stack">
            <TimeInput label="Start time" />
            <TimeInput label="Start time" step={60} description="One-minute granularity." />
            <TimeInput
              label="End time"
              defaultValue="08:00"
              error="Choose an end time after the start time."
            />
            <TimeInput label="Start time" defaultValue="09:30" disabled />
          </div>
        ),
      },
    ],
  },
  {
    id: "number-input",
    name: "NumberInput",
    group: "Atoms",
    summary:
      "Bounds, step and an announced unit. Scrolling the page over a focused number field silently changes its value in most browsers; this one does not.",
    states: [
      {
        id: "number-input-states",
        name: "States",
        description: "Default with a unit, bounded, error and disabled.",
        render: () => (
          <div className="specimen-stack">
            <NumberInput
              label="Estimate (optional)"
              unit="minutes"
              min={0}
              max={480}
              step={15}
              defaultValue={60}
              description="Your expected effort. You can update it later."
            />
            <NumberInput label="Target count" unit="per week" min={1} max={21} defaultValue={3} />
            <NumberInput
              label="Estimate"
              unit="minutes"
              defaultValue={-5}
              min={0}
              error="Enter a whole number of minutes."
            />
            <NumberInput label="Estimate" unit="minutes" defaultValue={60} disabled />
          </div>
        ),
      },
    ],
  },
]);

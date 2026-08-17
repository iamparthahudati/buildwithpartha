import { useRef, useState, type FormEvent } from "react";

import { Button, Select, Text, TextInput } from "@components/ui";
import {
  buildCommonDateRangePresets,
  ColorIconPicker,
  type ColorIconValue,
  Combobox,
  type ComboboxOption,
  DateRangeField,
  type DateRangeValue,
  DateTimeField,
  type DateTimeValue,
  DurationField,
  FormErrorSummary,
  FormField,
  FormFieldGroup,
  SearchField,
} from "@components/forms";

/**
 * Interactive demos for the composed-component catalog entries. They live
 * apart from the entry registry so that file exports only data and this one
 * only components, which keeps React Fast Refresh working.
 */

const PROJECT_OPTIONS = [
  { value: "portfolio-refresh", label: "Portfolio refresh" },
  { value: "home-records-cleanup", label: "Home records cleanup" },
];

export function CreateTaskFormDemo() {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // "Notes" is genuinely optional: it never produces an error, which is what
  // separates its (optional) label from the required fields beside it.
  const titleError = submitted && title.trim() === "" ? "Enter a task title." : undefined;
  const projectError = submitted && project === "" ? "Choose a project." : undefined;
  const hasErrors = Boolean(titleError) || Boolean(projectError);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    // The summary appears and takes focus only at the moment a submit has
    // actually failed, never while the user is still filling the form in.
    if (title.trim() === "" || project === "") {
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  return (
    <FormFieldGroup>
      <form className="specimen-stack" noValidate onSubmit={handleSubmit}>
        {hasErrors ? <FormErrorSummary ref={summaryRef} /> : null}

        <FormField name="title" label="Task title" {...(titleError ? { error: titleError } : {})}>
          {(field) => (
            <TextInput
              {...field}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          name="project"
          label="Project"
          {...(projectError ? { error: projectError } : {})}
        >
          {(field) => (
            <Select
              {...field}
              options={PROJECT_OPTIONS}
              placeholder="Choose a project"
              value={project}
              onChange={(event) => setProject(event.target.value)}
            />
          )}
        </FormField>

        <FormField name="notes" label="Notes" required={false}>
          {(field) => (
            <TextInput
              {...field}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          )}
        </FormField>

        <Button type="submit">Create task</Button>
      </form>
    </FormFieldGroup>
  );
}

const RECENT_SEARCHES = [
  "Prepare weekly review",
  "Compare hosting options",
  "Organize tax documents",
];

export function SearchFieldDebouncedDemo() {
  const [value, setValue] = useState("");
  const [lastSearch, setLastSearch] = useState("");

  const resultCount = value.trim() === "" ? undefined : value === "Prepare weekly review" ? 1 : 0;

  return (
    <div className="specimen-stack">
      <SearchField
        label="Search tasks"
        value={value}
        onValueChange={setValue}
        onSearch={setLastSearch}
        shortcutKey="/"
        recentSearches={RECENT_SEARCHES}
        {...(resultCount === undefined ? {} : { resultCount })}
      />
      <Text tone="secondary" size="sm">
        Last search fired: <code>{lastSearch === "" ? "(none yet)" : lastSearch}</code>
      </Text>
    </div>
  );
}

export function SearchFieldSubmitDemo() {
  const [value, setValue] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  return (
    <div className="specimen-stack">
      <SearchField
        label="Search tasks"
        value={value}
        onValueChange={setValue}
        onSearch={setSubmittedSearch}
        mode="submit"
      />
      <Text tone="secondary" size="sm">
        Press Enter to search. Fired:{" "}
        <code>{submittedSearch === "" ? "(none yet)" : submittedSearch}</code>
      </Text>
    </div>
  );
}

const LABEL_OPTIONS: readonly ComboboxOption[] = [
  { value: "deep-work", label: "Deep work" },
  { value: "reading", label: "Reading" },
  { value: "weekly-planning", label: "Weekly planning" },
  { value: "archived", label: "Archived", disabled: true },
];

export function ComboboxSingleDemo() {
  const [value, setValue] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  return (
    <Combobox
      label="Label"
      description="Type to filter, or use the arrow keys."
      options={LABEL_OPTIONS}
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
    />
  );
}

export function ComboboxMultiCreateDemo() {
  const [value, setValue] = useState<readonly string[]>([]);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState(LABEL_OPTIONS);

  return (
    <Combobox
      multiple
      label="Labels"
      description="Pick as many as apply, or create one that isn't listed yet."
      options={options}
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
      onCreateOption={(created) => {
        const option: ComboboxOption = {
          value: created.toLowerCase().replace(/\s+/g, "-"),
          label: created,
        };
        setOptions((current) => [...current, option]);
        setValue((current) => [...current, option.value]);
      }}
    />
  );
}

const DATE_RANGE_PRESETS = buildCommonDateRangePresets();

export function DateRangeFieldDemo() {
  const [value, setValue] = useState<DateRangeValue>({ start: null, end: null });

  return (
    <div className="specimen-stack">
      <DateRangeField
        legend="Reporting period"
        description="Shown in your current timezone: Asia/Kolkata."
        timeZone="Asia/Kolkata"
        value={value}
        onValueChange={setValue}
        presets={DATE_RANGE_PRESETS}
      />
      <Text tone="secondary" size="sm">
        Stored value: <code>{JSON.stringify(value)}</code>
      </Text>
    </div>
  );
}

export function DateRangeFieldInvalidOrderDemo() {
  const [value, setValue] = useState<DateRangeValue>({ start: "2026-08-20", end: "2026-08-10" });

  return (
    <DateRangeField
      legend="Reporting period"
      timeZone="Asia/Kolkata"
      value={value}
      onValueChange={setValue}
    />
  );
}

export function DateTimeFieldDemo() {
  const [value, setValue] = useState<DateTimeValue>({ date: "2026-08-17", time: "09:30" });

  return (
    <div className="specimen-stack">
      <DateTimeField
        legend="Reminder time"
        timeZone="Asia/Kolkata"
        value={value}
        onValueChange={setValue}
      />
      <Text tone="secondary" size="sm">
        Stored value: <code>{JSON.stringify(value)}</code>
      </Text>
    </div>
  );
}

/*
 * 2026-03-08 is when America/New_York clocks spring forward: 01:59:59 EST is
 * followed directly by 03:00:00 EDT, so 02:30 never happens on any clock
 * there. A fixed date is used rather than "the next transition from today",
 * so the specimen stays true regardless of when the catalog is viewed.
 */
export function DateTimeFieldGapDemo() {
  const [value, setValue] = useState<DateTimeValue>({ date: "2026-03-08", time: "02:30" });

  return (
    <DateTimeField
      legend="Reminder time"
      timeZone="America/New_York"
      value={value}
      onValueChange={setValue}
    />
  );
}

/*
 * 2026-11-01 is when America/New_York clocks fall back: 01:59:59 EDT is
 * followed by 01:00:00 EST, so every wall time in that hour happens twice.
 */
export function DateTimeFieldFoldDemo() {
  const [value, setValue] = useState<DateTimeValue>({ date: "2026-11-01", time: "01:30" });

  return (
    <DateTimeField
      legend="Reminder time"
      timeZone="America/New_York"
      value={value}
      onValueChange={setValue}
    />
  );
}

export function DurationFieldDemo() {
  const [value, setValue] = useState<number | null>(90);

  return (
    <div className="specimen-stack">
      <DurationField
        legend="Estimate (optional)"
        locale="en-US"
        value={value}
        onValueChange={setValue}
        description="Your expected effort. You can update it later."
      />
      <Text tone="secondary" size="sm">
        Stored value: <code>{value === null ? "(none)" : `${value} minutes`}</code>
      </Text>
    </div>
  );
}

export function DurationFieldBoundedDemo() {
  const [value, setValue] = useState<number | null>(10);

  return (
    <DurationField
      legend="Focus Session length"
      locale="en-US"
      value={value}
      onValueChange={setValue}
      min={15}
      max={180}
      description="Between 15 minutes and 3 hours."
    />
  );
}

export function ColorIconPickerDemo() {
  // "amber", not one of the swatch names ("blue", "green", "purple", "teal",
  // "red", "olive") that would read as a plain CSS named color to the
  // design-token verifier's `color:`-property check.
  const [value, setValue] = useState<ColorIconValue>({ color: "amber", icon: "rocket" });

  return (
    <div className="specimen-stack">
      <ColorIconPicker legend="Appearance" value={value} onValueChange={setValue} />
      <Text tone="secondary" size="sm">
        Stored value: <code>{JSON.stringify(value)}</code>
      </Text>
    </div>
  );
}

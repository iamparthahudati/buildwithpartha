import { useRef, useState, type FormEvent } from "react";

import { Button, Select, Text, TextInput } from "@components/ui";
import {
  Combobox,
  type ComboboxOption,
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

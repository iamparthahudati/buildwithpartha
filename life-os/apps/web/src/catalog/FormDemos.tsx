import { useState } from "react";

import { DateInput, RadioGroup, Textarea, TextInput, TimeInput } from "@components/ui";
import { addLocalDays, formatLocalDate, todayLocalDate } from "@lib/localDateTime";

import { PRIORITY_OPTIONS } from "./formFixtures";

/**
 * Interactive demos for the form-control catalog entries. They live apart from
 * the entry registry so that file exports only data and this one exports only
 * components, which keeps React Fast Refresh working.
 */

export function PriorityDemo({ orientation }: { orientation?: "vertical" | "horizontal" }) {
  const [value, setValue] = useState("P2");

  return (
    <RadioGroup
      legend="Priority"
      name={`catalog-priority-${orientation ?? "vertical"}`}
      options={PRIORITY_OPTIONS}
      value={value}
      onValueChange={setValue}
      {...(orientation ? { orientation } : {})}
    />
  );
}

export function ClearableDemo() {
  const [value, setValue] = useState("Website refresh");

  return (
    <TextInput
      label="Search tasks"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onClear={() => setValue("")}
      description="Clearing is also possible from the keyboard, so the button is not a tab stop."
    />
  );
}

export function NotesDemo() {
  const [value, setValue] = useState("");

  return (
    <Textarea
      label="Notes"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      counterMax={140}
      autoGrow
      description="Grows with its content; the counter warns rather than truncating a paste."
    />
  );
}

/**
 * The date specimen proves the point of the control: the value stays a
 * calendar date, so the echoed string and the formatted date always name the
 * same day, whatever zone the machine viewing the catalog is set to.
 */
export function DueDateDemo({ timeZone = "Asia/Kolkata" }: { timeZone?: string }) {
  const today = todayLocalDate(timeZone);
  const [value, setValue] = useState(today);

  return (
    <div className="specimen-stack">
      <DateInput
        label="Due date (optional)"
        value={value}
        min={today}
        max={addLocalDays(today, 365)}
        onChange={(event) => setValue(event.target.value)}
        onClear={() => setValue("")}
        description={`Today in ${timeZone} is ${today}. Dates before it are out of range.`}
      />
      <p className="lifeos-field__description">
        Stored value: <code>{value === "" ? "(none)" : value}</code>
        {value === "" ? null : ` · shown as ${formatLocalDate(value, "en-GB")}`}
      </p>
    </div>
  );
}

export function StartTimeDemo() {
  const [value, setValue] = useState("09:30");

  return (
    <div className="specimen-stack">
      <TimeInput
        label="Start time"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onClear={() => setValue("")}
        description="Displayed in the platform's 12- or 24-hour preference."
      />
      <p className="lifeos-field__description">
        Stored value: <code>{value === "" ? "(none)" : value}</code>
      </p>
    </div>
  );
}

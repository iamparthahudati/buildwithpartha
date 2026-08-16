import { useState } from "react";

import { RadioGroup, TextInput } from "@components/ui";

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

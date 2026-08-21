import { useState } from "react";

import { Select, Text } from "@components/ui";
import { TasksScreen } from "@features/tasks";

export function TasksScreenDemo() {
  const [demoState, setDemoState] = useState<
    "normal" | "empty" | "loading" | "error" | "partial-failure"
  >("normal");

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--lifeos-space-3)",
          marginBottom: "var(--lifeos-space-4)",
        }}
      >
        <Text size="sm" tone="secondary">
          Specimen state
        </Text>
        <Select
          label="State"
          labelHidden
          value={demoState}
          onChange={(event) =>
            setDemoState(
              event.target.value as "normal" | "empty" | "loading" | "error" | "partial-failure",
            )
          }
          options={[
            { value: "normal", label: "Populated" },
            { value: "empty", label: "First-use empty" },
            { value: "loading", label: "Loading" },
            { value: "error", label: "Error" },
            { value: "partial-failure", label: "Partial bulk failure" },
          ]}
        />
      </div>

      {demoState === "normal" ? <TasksScreen /> : null}
      {demoState === "empty" ? <TasksScreen initialTasks={[]} /> : null}
      {demoState === "loading" ? <TasksScreen loading /> : null}
      {demoState === "error" ? (
        <TasksScreen error="The task list is temporarily unavailable." />
      ) : null}
      {demoState === "partial-failure" ? (
        <TasksScreen simulateBulkFailures={["task-weekly-review"]} />
      ) : null}
    </div>
  );
}

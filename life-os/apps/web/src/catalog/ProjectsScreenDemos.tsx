import { useState } from "react";
import { Select, Text } from "@components/ui";
import { ProjectsScreen } from "@features/projects";

export function ProjectsScreenDemo() {
  const [demoState, setDemoState] = useState<
    "normal" | "empty" | "filtered-empty" | "loading" | "error"
  >("normal");

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--lifeos-spacing-3)",
          marginBottom: "var(--lifeos-spacing-4)",
        }}
      >
        <Text size="sm" tone="secondary">
          Specimen State:
        </Text>
        <Select
          label="State"
          labelHidden
          value={demoState}
          onChange={(e) => setDemoState(e.target.value as any)}
          options={[
            { value: "normal", label: "Normal (Populated)" },
            { value: "empty", label: "First-use Empty" },
            { value: "filtered-empty", label: "Filtered Empty" },
            { value: "loading", label: "Loading" },
            { value: "error", label: "Error" },
          ]}
        />
      </div>

      {demoState === "normal" && <ProjectsScreen />}
      {demoState === "empty" && <ProjectsScreen initialProjects={[]} />}
      {demoState === "loading" && <ProjectsScreen loading />}
      {demoState === "error" && (
        <ProjectsScreen error="Network timeout: Failed to connect to project service." />
      )}
      {demoState === "filtered-empty" && <ProjectsScreen initialProjects={[]} />}
    </div>
  );
}

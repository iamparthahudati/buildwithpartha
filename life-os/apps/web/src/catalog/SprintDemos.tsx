import { useState } from "react";
import {
  SprintCard,
  SprintProgressCapacity,
  SprintTaskCommitmentList,
  SprintScopeChangeHistory,
  SprintFormDialog,
  SprintRetrospectiveDialog,
  type Sprint,
  type SprintTask,
  type SprintScopeChangeEvent,
} from "@features/sprints";
import { Button } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

const MOCK_SPRINT: Sprint = {
  id: "sprint-demo-1",
  name: "Sprint 14 — Shell & Identity",
  goal: "Deliver application shell, authentication workflows, and core feature components.",
  startDate: "2026-08-15" as LocalDate,
  endDate: "2026-08-29" as LocalDate,
  status: "ACTIVE",
  targetCapacityPoints: 30,
  completedStoryPoints: 18,
  totalStoryPoints: 25,
};

const MOCK_TASKS: readonly SprintTask[] = [
  {
    id: "st-1",
    sprintId: "sprint-demo-1",
    taskId: "task-101",
    title: "Build SprintCard & Progress Capacity components",
    status: "DONE",
    storyPoints: 8,
    projectName: "LifeOS Web",
    priority: "P2",
    isCommitted: true,
  },
  {
    id: "st-2",
    sprintId: "sprint-demo-1",
    taskId: "task-102",
    title: "Build SprintForm & Retrospective dialogs",
    status: "DONE",
    storyPoints: 10,
    projectName: "LifeOS Web",
    priority: "P2",
    isCommitted: true,
  },
  {
    id: "st-3",
    sprintId: "sprint-demo-1",
    taskId: "task-103",
    title: "Sprint scope change history component",
    status: "IN_PROGRESS",
    storyPoints: 7,
    projectName: "LifeOS Web",
    priority: "P3",
    isCommitted: false,
  },
];

const MOCK_EVENTS: readonly SprintScopeChangeEvent[] = [
  {
    id: "evt-101",
    sprintId: "sprint-demo-1",
    changeType: "TASK_ADDED",
    taskId: "task-103",
    taskTitle: "Sprint scope change history component",
    pointsDelta: 7,
    reason: "Added to complete Epic 10 sprint UI requirements.",
    timestamp: "2026-08-19 11:45",
  },
];

export function SprintCardDemo() {
  return (
    <div style={{ maxWidth: 640 }}>
      <SprintCard sprint={MOCK_SPRINT} />
    </div>
  );
}

export function SprintProgressCapacityDemo() {
  return (
    <div style={{ maxWidth: 640 }}>
      <SprintProgressCapacity sprint={MOCK_SPRINT} />
    </div>
  );
}

export function SprintTaskCommitmentListDemo() {
  const [tasks, setTasks] = useState(MOCK_TASKS);

  function handleToggle(taskId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === "DONE" ? "IN_PROGRESS" : "DONE" } : t,
      ),
    );
  }

  function handleRemove(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <SprintTaskCommitmentList
        tasks={tasks}
        onToggleTaskStatus={handleToggle}
        onRemoveTask={handleRemove}
      />
    </div>
  );
}

export function SprintScopeChangeHistoryDemo() {
  return (
    <div style={{ maxWidth: 640 }}>
      <SprintScopeChangeHistory events={MOCK_EVENTS} />
    </div>
  );
}

export function SprintFormDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Sprint Form</Button>
      <SprintFormDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(data) => {
          console.log("Sprint Form Submitted:", data);
          setOpen(false);
        }}
        initialValues={{
          name: "Sprint 15 — Week Planner",
          startDate: "2026-08-30",
          endDate: "2026-09-13",
          targetCapacityPoints: 25,
        }}
      />
    </div>
  );
}

export function SprintRetrospectiveDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Retrospective Dialog</Button>
      <SprintRetrospectiveDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(data) => {
          console.log("Retrospective Submitted:", data);
          setOpen(false);
        }}
        sprint={MOCK_SPRINT}
      />
    </div>
  );
}

import { Button } from "@components/ui";
import { Menu, type MenuItemDescriptor } from "@components/navigation";

import type { TaskFormLabelOption, TaskFormProjectOption } from "./TaskForm";
import type { TaskPriority, TaskStatus } from "../model/task";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "../model/taskPresentation";
import type { BulkTaskAction } from "../model/taskScreen";

const STATUS_ACTIONS: readonly TaskStatus[] = [
  "TO_DO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];

const PRIORITY_ACTIONS: readonly TaskPriority[] = ["P1", "P2", "P3", "P4"];

export interface TaskBulkActionsProps {
  readonly projects: readonly TaskFormProjectOption[];
  readonly labels: readonly TaskFormLabelOption[];
  readonly disabled?: boolean;
  readonly onAction: (action: BulkTaskAction) => void;
  readonly onSchedule: () => void;
  readonly onArchive: () => void;
}

export function TaskBulkActions({
  projects,
  labels,
  disabled = false,
  onAction,
  onSchedule,
  onArchive,
}: TaskBulkActionsProps) {
  const statusItems: MenuItemDescriptor[] = STATUS_ACTIONS.map((status) => ({
    type: "item",
    id: `status-${status}`,
    label: TASK_STATUS_LABEL[status],
    disabled,
    onSelect: () => onAction({ type: "STATUS", status }),
  }));

  const priorityItems: MenuItemDescriptor[] = PRIORITY_ACTIONS.map((priority) => ({
    type: "item",
    id: `priority-${priority}`,
    label: TASK_PRIORITY_LABEL[priority],
    disabled,
    onSelect: () => onAction({ type: "PRIORITY", priority }),
  }));

  const projectItems: MenuItemDescriptor[] = projects.map((project) => ({
    type: "item",
    id: `project-${project.id}`,
    label: project.name,
    disabled: disabled || Boolean(project.disabled),
    onSelect: () => onAction({ type: "PROJECT", projectId: project.id }),
  }));

  const labelItems: MenuItemDescriptor[] = [
    ...labels.map((label) => ({
      type: "item" as const,
      id: `add-label-${label.id}`,
      label: `Add ${label.name}`,
      disabled: disabled || Boolean(label.disabled),
      onSelect: () => onAction({ type: "ADD_LABEL", labelId: label.id }),
    })),
    ...(labels.length > 0 ? [{ type: "separator" as const, id: "label-separator" }] : []),
    ...labels.map((label) => ({
      type: "item" as const,
      id: `remove-label-${label.id}`,
      label: `Remove ${label.name}`,
      disabled: disabled || Boolean(label.disabled),
      onSelect: () => onAction({ type: "REMOVE_LABEL", labelId: label.id }),
    })),
  ];

  return (
    <div className="lifeos-task-bulk-actions">
      <Menu
        label="Change status of selected tasks"
        trigger={
          <Button type="button" variant="secondary" size="sm" disabled={disabled}>
            Status
          </Button>
        }
        items={statusItems}
      />
      <Menu
        label="Change priority of selected tasks"
        trigger={
          <Button type="button" variant="secondary" size="sm" disabled={disabled}>
            Priority
          </Button>
        }
        items={priorityItems}
      />
      {projectItems.length > 0 ? (
        <Menu
          label="Move selected tasks to a project"
          trigger={
            <Button type="button" variant="secondary" size="sm" disabled={disabled}>
              Project
            </Button>
          }
          items={projectItems}
        />
      ) : null}
      {labelItems.length > 0 ? (
        <Menu
          label="Change labels on selected tasks"
          trigger={
            <Button type="button" variant="secondary" size="sm" disabled={disabled}>
              Labels
            </Button>
          }
          items={labelItems}
        />
      ) : null}
      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onSchedule}>
        Schedule
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => onAction({ type: "CLEAR_SCHEDULE" })}
      >
        Clear schedule
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onArchive}>
        Archive
      </Button>
    </div>
  );
}

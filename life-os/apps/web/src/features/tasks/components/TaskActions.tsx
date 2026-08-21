import { MoreHorizontal } from "lucide-react";

import { IconButton } from "@components/ui";
import { Menu, type MenuItemDescriptor } from "@components/navigation";

import type { TaskListItem } from "../model/task";
import { isTaskTerminal } from "../model/taskPresentation";

export interface TaskActionCallbacks {
  readonly onEdit?: () => void;
  readonly onStartFocus?: () => void;
  readonly onToggleMit?: () => void;
  readonly onMarkDone?: () => void;
  readonly onReopen?: () => void;
  readonly onDuplicate?: () => void;
  readonly onArchive?: () => void;
  readonly onRestore?: () => void;
  readonly onDelete?: () => void;
}

interface TaskActionsProps extends TaskActionCallbacks {
  readonly task: TaskListItem;
  readonly className?: string;
}

export function TaskActions({
  task,
  onEdit,
  onStartFocus,
  onToggleMit,
  onMarkDone,
  onReopen,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
  className,
}: TaskActionsProps) {
  const isArchived = Boolean(task.archivedAt);
  const isTerminal = isTaskTerminal(task);
  const items: MenuItemDescriptor[] = [];

  if (isArchived) {
    if (onRestore) {
      items.push({ type: "item", id: "restore", label: "Restore task", onSelect: onRestore });
    }
    if (onDelete) {
      items.push({
        type: "item",
        id: "delete",
        label: "Delete task",
        onSelect: onDelete,
        destructive: true,
      });
    }
  } else {
    if (onStartFocus && !isTerminal && task.status !== "BLOCKED") {
      items.push({
        type: "item",
        id: "start-focus",
        label: "Start focus",
        onSelect: onStartFocus,
      });
    }
    if (onToggleMit && !isTerminal) {
      items.push({
        type: "item",
        id: "toggle-mit",
        label: task.isMit ? "Remove MIT" : "Set as MIT",
        onSelect: onToggleMit,
      });
    }
    if (onMarkDone && !isTerminal) {
      items.push({
        type: "item",
        id: "mark-done",
        label: "Mark done",
        onSelect: onMarkDone,
      });
    }
    if (onReopen && isTerminal) {
      items.push({ type: "item", id: "reopen", label: "Reopen task", onSelect: onReopen });
    }
    if (onEdit) {
      items.push({ type: "item", id: "edit", label: "Edit task", onSelect: onEdit });
    }
    if (onDuplicate) {
      items.push({
        type: "item",
        id: "duplicate",
        label: "Duplicate task",
        onSelect: onDuplicate,
      });
    }
    if (onArchive) {
      items.push({ type: "item", id: "archive", label: "Archive task", onSelect: onArchive });
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Menu
      trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${task.title}`} size="sm" />}
      items={items}
      label={`Actions for ${task.title}`}
      align="end"
      {...(className ? { className } : {})}
    />
  );
}

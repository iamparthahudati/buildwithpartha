import { Drawer } from "@components/feedback";

import { TaskDetailsScreen, type TaskDetailsScreenProps } from "./TaskDetailsScreen";
import "./task-details-sheet.css";

export interface TaskDetailsSheetProps extends TaskDetailsScreenProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Responsive list-context presentation for Task Details (LOS-0818).
 *
 * `Drawer` is a trailing 380–480px-class sheet on wider layouts and a full-screen
 * sheet below 768px. Keeping the list mounted preserves its query, page, scroll,
 * and selection; Drawer restores focus to the exact trigger that opened it.
 */
export function TaskDetailsSheet({ open, onClose, task, ...screenProps }: TaskDetailsSheetProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task?.title ?? "Task details"}
      titleHidden
      closeLabel="Close task details"
      className="lifeos-task-details-sheet"
    >
      <TaskDetailsScreen {...screenProps} {...(task ? { task } : {})} onReturnToList={onClose} />
    </Drawer>
  );
}

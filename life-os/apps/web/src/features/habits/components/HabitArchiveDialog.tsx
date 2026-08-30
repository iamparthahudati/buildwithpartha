import { ConfirmDialog } from "@components/feedback";

import type { Habit } from "../model/habit";

export interface HabitArchiveDialogProps {
  readonly open: boolean;
  readonly habit: Habit;
  readonly pending?: boolean;
  readonly error?: string;
  readonly onClose: () => void;
  readonly onArchive: (habit: Habit) => void;
}

export function HabitArchiveDialog({
  open,
  habit,
  pending = false,
  error,
  onClose,
  onArchive,
}: HabitArchiveDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => onArchive(habit)}
      title={`Archive “${habit.name}”?`}
      description="The Habit will leave active views and stop accepting new entries. Its history remains available, and you can restore it from Archived."
      confirmLabel="Archive Habit"
      pending={pending}
      pendingLabel="Archiving Habit…"
      {...(error ? { error } : {})}
    />
  );
}

import {
  CheckSquare,
  FileText,
  Folder,
  Inbox,
  Repeat,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { SearchEntityType } from "./search";

export function getSearchEntityIcon(type: SearchEntityType): LucideIcon {
  switch (type) {
    case "PROJECT":
      return Folder;
    case "TASK":
      return CheckSquare;
    case "NOTE":
      return FileText;
    case "BRAIN_DUMP":
      return Inbox;
    case "GOAL":
      return Target;
    case "HABIT":
      return Repeat;
    default:
      return FileText;
  }
}

export function getSearchEntityLabel(type: SearchEntityType): string {
  switch (type) {
    case "PROJECT":
      return "Projects";
    case "TASK":
      return "Tasks";
    case "NOTE":
      return "Notes";
    case "BRAIN_DUMP":
      return "Brain Dump";
    case "GOAL":
      return "Goals";
    case "HABIT":
      return "Habits";
    default:
      return type;
  }
}

export function getSearchEntitySingularLabel(type: SearchEntityType): string {
  switch (type) {
    case "PROJECT":
      return "Project";
    case "TASK":
      return "Task";
    case "NOTE":
      return "Note";
    case "BRAIN_DUMP":
      return "Brain Dump Item";
    case "GOAL":
      return "Goal";
    case "HABIT":
      return "Habit";
    default:
      return type;
  }
}

export function stripHtmlMarkTags(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/<\/?mark>/gi, "");
}

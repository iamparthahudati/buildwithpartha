import { FolderKanban } from "lucide-react";

import { Badge, Icon, Link, ProgressBar, Surface, Text } from "@components/ui";

import "./active-project-row.css";

/** A project projection shaped for the compact Today list. */
export interface TodayActiveProject {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly completedTasksCount: number;
  readonly totalTasksCount: number;
}

export interface ActiveProjectRowProps {
  readonly project: TodayActiveProject;
  readonly className?: string;
}

function taskCountLabel(count: number): string {
  return `${count} ${count === 1 ? "task" : "tasks"}`;
}

/**
 * A single active Project row for Today (LOS-0612).
 *
 * The Project name is the real navigation control; the surrounding card only
 * follows its focus. Progress is derived from the supplied canonical Project
 * task counts and is omitted when there is no meaningful denominator.
 */
export function ActiveProjectRow({ project, className }: ActiveProjectRowProps) {
  const total = Math.max(0, project.totalTasksCount);
  const completed = Math.min(Math.max(0, project.completedTasksCount), total);
  const progressText = `${completed} of ${taskCountLabel(total)} done`;

  return (
    <Surface
      as="li"
      padding="sm"
      interactive
      className={["lifeos-active-project-row", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-active-project-row__identity">
        <Icon icon={FolderKanban} decorative size="md" />
        <div className="lifeos-active-project-row__name-group">
          <Link
            href={project.href}
            quiet
            className="lifeos-active-project-row__name"
            aria-label={`Open project: ${project.name}`}
          >
            {project.name}
          </Link>
          <Badge tone="info">Active</Badge>
        </div>
      </div>

      {total > 0 ? (
        <ProgressBar
          label={`${project.name} progress`}
          value={completed}
          max={total}
          valueText={progressText}
          showValue
          size="sm"
          className="lifeos-active-project-row__progress"
        />
      ) : (
        <Text tone="muted" size="xs" className="lifeos-active-project-row__empty-progress">
          No tasks yet.
        </Text>
      )}
    </Surface>
  );
}

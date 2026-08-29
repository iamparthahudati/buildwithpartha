import { FolderKanban, MoreHorizontal } from "lucide-react";

import {
  Badge,
  DecorativeStatusDot,
  Icon,
  IconButton,
  Link,
  ProgressBar,
  Skeleton,
  Surface,
  Text,
  VisuallyHidden,
} from "@components/ui";
import { Menu, type MenuItemDescriptor } from "@components/navigation";
import { COLOR_SWATCHES, ICON_OPTIONS } from "@components/forms";
import { formatLocalDate, todayLocalDate, compareLocalDates } from "@lib/localDateTime";
import { formatAbsoluteCommentTime, formatRelativeCommentTime } from "@components/navigation";

import type { Project, ProjectStatus, ProjectPriority, ProjectHealth } from "../model/project";
import "./project-card.css";

export interface ProjectCardProps {
  readonly project?: Project;
  readonly loading?: boolean;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly onEdit?: () => void;
  readonly onArchive?: () => void;
  readonly onRestore?: () => void;
  readonly onComplete?: () => void;
  readonly onCancel?: () => void;
  readonly onDelete?: () => void;
  readonly href?: string;
  readonly className?: string;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_TONES: Record<ProjectStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  PLANNED: "neutral",
  ACTIVE: "info",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  P1: "P1 — High",
  P2: "P2 — Medium",
  P3: "P3 — Low",
  P4: "P4 — Someday",
};

const PRIORITY_TONES: Record<ProjectPriority, "danger" | "warning" | "info" | "neutral"> = {
  P1: "danger",
  P2: "warning",
  P3: "info",
  P4: "neutral",
};

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
  NOT_SET: "Not set",
};

const HEALTH_TONES: Record<ProjectHealth, "success" | "warning" | "danger" | "neutral"> = {
  ON_TRACK: "success",
  AT_RISK: "warning",
  OFF_TRACK: "danger",
  NOT_SET: "neutral",
};

function getProjectColor(colorName?: string | null): string {
  if (!colorName) return "var(--lifeos-color-text-muted)";
  const swatch = COLOR_SWATCHES.find((s) => s.name === colorName);
  return swatch ? `var(${swatch.token})` : "var(--lifeos-color-text-muted)";
}

function getProjectIcon(iconName?: string | null) {
  if (!iconName) return FolderKanban;
  const option = ICON_OPTIONS.find((o) => o.name === iconName);
  return option ? option.icon : FolderKanban;
}

export function ProjectCard({
  project,
  loading = false,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  onEdit,
  onArchive,
  onRestore,
  onComplete,
  onCancel,
  onDelete,
  href,
  className,
}: ProjectCardProps) {
  const rootClass = ["lifeos-project-card", className].filter(Boolean).join(" ");

  if (loading || !project) {
    return (
      <Surface
        as="div"
        bordered
        padding="md"
        className={[rootClass, "lifeos-project-card--loading"].join(" ")}
      >
        <VisuallyHidden>Loading project card.</VisuallyHidden>
        <div className="lifeos-project-card__header">
          <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
          <Skeleton shape="circle" width="2rem" height="2rem" />
        </div>
        <div className="lifeos-project-card__content">
          <Skeleton shape="line" width="70%" height="1.25rem" />
          <Skeleton shape="line" width="90%" height="0.875rem" />
          <Skeleton shape="line" width="40%" height="0.875rem" />
        </div>
        <div className="lifeos-project-card__footer">
          <Skeleton shape="line" width="30%" height="0.75rem" />
          <Skeleton shape="line" width="50%" height="0.75rem" />
        </div>
      </Surface>
    );
  }

  const isArchived = Boolean(project.archivedAt);
  const isOverdue =
    !isArchived &&
    project.status !== "COMPLETED" &&
    project.status !== "CANCELLED" &&
    project.deadlineDate !== null &&
    project.deadlineDate !== undefined &&
    compareLocalDates(project.deadlineDate, todayLocalDate(timeZone, now)) < 0;

  const projectIcon = getProjectIcon(project.icon);
  const projectColor = getProjectColor(project.color);
  const projectHref = href ?? `/life-os/app/projects/${project.id}`;

  const relativeUpdated = formatRelativeCommentTime(project.updatedAt, locale, now);
  const absoluteUpdated = formatAbsoluteCommentTime(project.updatedAt, locale, timeZone);

  // Build Actions menu items
  const menuItems: MenuItemDescriptor[] = [];
  if (isArchived) {
    if (onRestore) {
      menuItems.push({
        type: "item",
        id: "restore",
        label: "Restore",
        onSelect: onRestore,
      });
    }
    if (onDelete) {
      menuItems.push({
        type: "item",
        id: "delete",
        label: "Delete",
        onSelect: onDelete,
        destructive: true,
      });
    }
  } else {
    if (onEdit) {
      menuItems.push({
        type: "item",
        id: "edit",
        label: "Edit",
        onSelect: onEdit,
      });
    }
    if (onComplete && project.status !== "COMPLETED") {
      menuItems.push({
        type: "item",
        id: "complete",
        label: "Complete",
        onSelect: onComplete,
      });
    }
    if (onCancel && project.status !== "CANCELLED") {
      menuItems.push({
        type: "item",
        id: "cancel",
        label: "Cancel",
        onSelect: onCancel,
      });
    }
    if (onArchive) {
      menuItems.push({
        type: "item",
        id: "archive",
        label: "Archive",
        onSelect: onArchive,
      });
    }
  }

  const progressTotal = Math.max(0, project.totalTasksCount);
  const progressCompleted = Math.min(Math.max(0, project.completedTasksCount), progressTotal);
  const progressText = `${progressCompleted} of ${progressTotal} tasks done`;

  return (
    <Surface
      as="div"
      bordered
      interactive
      padding="md"
      className={[
        rootClass,
        isArchived && "lifeos-project-card--archived",
        isOverdue && "lifeos-project-card--overdue",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="lifeos-project-card__header">
        <div className="lifeos-project-card__identity">
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt=""
              loading="lazy"
              className="lifeos-project-card__logo"
            />
          ) : (
            <div
              className="lifeos-project-card__icon-swatch"
              style={{ backgroundColor: projectColor }}
              aria-hidden="true"
            >
              <Icon icon={projectIcon} decorative size="md" className="lifeos-project-card__icon" />
            </div>
          )}
          <div className="lifeos-project-card__identity-text">
            <Link
              href={projectHref}
              className="lifeos-project-card__name"
              aria-label={`Open project: ${project.name}`}
            >
              {project.name}
            </Link>
            <div className="lifeos-project-card__badges">
              {isArchived ? (
                <Badge tone="neutral" className="lifeos-project-card__archived-badge">
                  Archived
                </Badge>
              ) : null}
              {isOverdue ? (
                <Badge tone="danger" className="lifeos-project-card__overdue-badge">
                  Overdue
                </Badge>
              ) : null}
              <Badge tone={STATUS_TONES[project.status]}>{STATUS_LABELS[project.status]}</Badge>
              <Badge tone={PRIORITY_TONES[project.priority]}>
                {PRIORITY_LABELS[project.priority]}
              </Badge>
            </div>
          </div>
        </div>
        {menuItems.length > 0 ? (
          <div className="lifeos-project-card__actions">
            <Menu
              trigger={
                <IconButton
                  icon={MoreHorizontal}
                  label="Project actions"
                  variant="ghost"
                  size="sm"
                />
              }
              items={menuItems}
              label="Project actions"
              align="end"
            />
          </div>
        ) : null}
      </div>

      <div className="lifeos-project-card__content">
        {project.description ? (
          <Text tone="secondary" size="xs" className="lifeos-project-card__description">
            {project.description}
          </Text>
        ) : null}

        <div className="lifeos-project-card__progress-container">
          {progressTotal > 0 ? (
            <ProgressBar
              label={`${project.name} progress`}
              value={progressCompleted}
              max={progressTotal}
              valueText={progressText}
              showValue
              size="sm"
              className="lifeos-project-card__progress"
            />
          ) : (
            <Text tone="muted" size="xs" className="lifeos-project-card__empty-progress">
              No tasks yet.
            </Text>
          )}
        </div>
      </div>

      <div className="lifeos-project-card__footer">
        <div className="lifeos-project-card__health">
          <DecorativeStatusDot tone={HEALTH_TONES[project.health]} />
          <Text size="xs" tone="secondary">
            {HEALTH_LABELS[project.health]}
          </Text>
        </div>

        <div className="lifeos-project-card__meta">
          <div className="lifeos-project-card__deadline">
            <Text size="xs" tone={isOverdue ? "danger" : "secondary"}>
              {project.deadlineDate
                ? `Deadline: ${formatLocalDate(project.deadlineDate, locale)}`
                : "No deadline"}
            </Text>
          </div>
          <div className="lifeos-project-card__updated">
            <Text size="xs" tone="muted" aria-label={`Last updated: ${absoluteUpdated}`}>
              Updated {relativeUpdated}
            </Text>
          </div>
        </div>
      </div>
    </Surface>
  );
}

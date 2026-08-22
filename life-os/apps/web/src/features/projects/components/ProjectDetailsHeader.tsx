import type { ReactNode } from "react";
import { FolderKanban, MoreHorizontal, Plus } from "lucide-react";

import {
  Badge,
  Button,
  Heading,
  Icon,
  IconButton,
  ProgressBar,
  Skeleton,
  Surface,
  Text,
  VisuallyHidden,
} from "@components/ui";
import {
  Breadcrumbs,
  Menu,
  type BreadcrumbItem,
  type MenuItemDescriptor,
} from "@components/navigation";
import { COLOR_SWATCHES, ICON_OPTIONS } from "@components/forms";
import { formatLocalDate, todayLocalDate, compareLocalDates } from "@lib/localDateTime";

import type { Project, ProjectStatus, ProjectPriority, ProjectHealth } from "../model/project";
import "./project-details-header.css";

export interface ProjectDetailsHeaderProps {
  readonly project?: Project;
  readonly ownerName?: string;
  readonly estimatedHours?: number;
  readonly estimateLabel?: string;
  readonly loading?: boolean;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly backHref?: string;
  readonly backLabel?: string;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  readonly onAddTask?: () => void;
  readonly onEdit?: () => void;
  readonly onArchive?: () => void;
  readonly onRestore?: () => void;
  readonly onComplete?: () => void;
  readonly onCancel?: () => void;
  readonly onDelete?: () => void;
  readonly primaryAction?: ReactNode;
  readonly secondaryActions?: readonly MenuItemDescriptor[];
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

export function ProjectDetailsHeader({
  project,
  ownerName = "You",
  estimatedHours,
  estimateLabel,
  loading = false,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  backHref = "/life-os/app/projects",
  backLabel = "Projects",
  breadcrumbs: customBreadcrumbs,
  onAddTask,
  onEdit,
  onArchive,
  onRestore,
  onComplete,
  onCancel,
  onDelete,
  primaryAction: customPrimaryAction,
  secondaryActions: customSecondaryActions,
  className,
}: ProjectDetailsHeaderProps) {
  if (loading || !project) {
    return (
      <header
        aria-label="Loading project header"
        className={[
          "lifeos-project-details-header",
          "lifeos-project-details-header--loading",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="lifeos-project-details-header__breadcrumbs">
          <Skeleton shape="line" width="160px" height="20px" />
        </div>
        <div className="lifeos-project-details-header__main">
          <div className="lifeos-project-details-header__identity">
            <Skeleton shape="block" width="44px" height="44px" />
            <div className="lifeos-project-details-header__title-block">
              <Skeleton shape="line" width="240px" height="32px" />
              <Skeleton shape="line" width="320px" height="20px" />
            </div>
          </div>
          <div className="lifeos-project-details-header__actions">
            <Skeleton shape="block" width="110px" height="40px" />
            <Skeleton shape="block" width="40px" height="40px" />
          </div>
        </div>
        <div className="lifeos-project-details-header__metadata">
          <Skeleton shape="line" width="280px" height="24px" />
          <Skeleton shape="line" width="360px" height="20px" />
        </div>
        <VisuallyHidden>Loading project details header.</VisuallyHidden>
      </header>
    );
  }

  const isArchived = Boolean(project.archivedAt);
  const today = todayLocalDate(timeZone, now);
  const isOverdue =
    Boolean(project.deadlineDate) &&
    compareLocalDates(project.deadlineDate!, today) < 0 &&
    project.status !== "COMPLETED" &&
    project.status !== "CANCELLED" &&
    !isArchived;

  const breadcrumbs: readonly BreadcrumbItem[] = customBreadcrumbs ?? [
    { label: backLabel, href: backHref },
    { label: project.name, href: `${backHref}/${project.id}` },
  ];

  const ProjectIcon = getProjectIcon(project.icon);
  const iconColor = getProjectColor(project.color);

  // Compute default secondary menu items if not overridden
  const defaultSecondaryActions: MenuItemDescriptor[] = [];
  if (onEdit) {
    defaultSecondaryActions.push({
      type: "item",
      id: "edit",
      label: "Edit project",
      onSelect: onEdit,
    });
  }
  if (onComplete && project.status !== "COMPLETED" && !isArchived) {
    defaultSecondaryActions.push({
      type: "item",
      id: "complete",
      label: "Mark complete",
      onSelect: onComplete,
    });
  }
  if (isArchived) {
    if (onRestore) {
      defaultSecondaryActions.push({
        type: "item",
        id: "restore",
        label: "Restore project",
        onSelect: onRestore,
      });
    }
  } else {
    if (onArchive) {
      defaultSecondaryActions.push({
        type: "item",
        id: "archive",
        label: "Archive project",
        onSelect: onArchive,
      });
    }
  }
  if (!isArchived && project.status !== "CANCELLED" && onCancel) {
    defaultSecondaryActions.push({
      type: "item",
      id: "cancel",
      label: "Cancel project",
      onSelect: onCancel,
    });
  }
  if (onDelete) {
    defaultSecondaryActions.push({
      type: "item",
      id: "delete",
      label: "Delete project",
      onSelect: onDelete,
      destructive: true,
    });
  }

  const secondaryActions = customSecondaryActions ?? defaultSecondaryActions;

  // Primary action: default to Add Task unless archived or customPrimaryAction provided
  const primaryAction =
    customPrimaryAction !== undefined ? (
      customPrimaryAction
    ) : !isArchived && onAddTask ? (
      <Button variant="primary" iconStart={Plus} onClick={onAddTask}>
        Add task
      </Button>
    ) : null;

  const hasActions = primaryAction !== null || secondaryActions.length > 0;

  // Dates display
  const startDateFormatted = project.startDate ? formatLocalDate(project.startDate, locale) : null;
  const deadlineDateFormatted = project.deadlineDate
    ? formatLocalDate(project.deadlineDate, locale)
    : null;

  let dateSummary: string | null = null;
  if (startDateFormatted && deadlineDateFormatted) {
    dateSummary = `${startDateFormatted} – ${deadlineDateFormatted}`;
  } else if (startDateFormatted) {
    dateSummary = `Starts ${startDateFormatted}`;
  } else if (deadlineDateFormatted) {
    dateSummary = `Due ${deadlineDateFormatted}`;
  }

  // Task count / progress display
  const hasTasks = project.totalTasksCount > 0;
  const taskProgressLabel = hasTasks
    ? `${project.completedTasksCount} / ${project.totalTasksCount} tasks`
    : "No tasks";

  // Estimate display
  const formattedEstimate =
    estimateLabel ?? (estimatedHours !== undefined ? `${estimatedHours}h estimated` : null);

  return (
    <Surface
      as="section"
      aria-label="Project details header"
      className={[
        "lifeos-project-details-header",
        isArchived ? "lifeos-project-details-header--archived" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="lifeos-project-details-header__breadcrumbs">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="lifeos-project-details-header__main">
        <div className="lifeos-project-details-header__identity">
          <div
            className="lifeos-project-details-header__icon-wrapper"
            style={{ color: iconColor }}
            aria-hidden="true"
          >
            <Icon icon={ProjectIcon} size="lg" decorative />
          </div>
          <div className="lifeos-project-details-header__title-block">
            <div className="lifeos-project-details-header__title-row">
              <Heading level={1} className="lifeos-project-details-header__title">
                {project.name}
              </Heading>
              {isArchived ? (
                <Badge tone="warning" className="lifeos-project-details-header__archived-badge">
                  Archived
                </Badge>
              ) : null}
            </div>
            {project.description ? (
              <Text tone="secondary" className="lifeos-project-details-header__description">
                {project.description}
              </Text>
            ) : null}
          </div>
        </div>

        {hasActions ? (
          <div className="lifeos-project-details-header__actions">
            {primaryAction}
            {secondaryActions.length > 0 ? (
              <Menu
                trigger={
                  <IconButton icon={MoreHorizontal} label="More actions" variant="secondary" />
                }
                items={secondaryActions}
                label="More actions"
                align="end"
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="lifeos-project-details-header__metadata">
        <div className="lifeos-project-details-header__badges">
          <Badge tone={STATUS_TONES[project.status]}>{STATUS_LABELS[project.status]}</Badge>
          <Badge tone={HEALTH_TONES[project.health]}>{HEALTH_LABELS[project.health]}</Badge>
          <Badge tone={PRIORITY_TONES[project.priority]}>{PRIORITY_LABELS[project.priority]}</Badge>
          {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
        </div>

        <div className="lifeos-project-details-header__facts">
          {ownerName ? (
            <Text tone="secondary" size="sm" className="lifeos-project-details-header__fact">
              <strong className="lifeos-project-details-header__fact-label">Owner:</strong>{" "}
              {ownerName}
            </Text>
          ) : null}

          {dateSummary ? (
            <Text
              tone={isOverdue ? "danger" : "secondary"}
              size="sm"
              className="lifeos-project-details-header__fact"
            >
              <strong className="lifeos-project-details-header__fact-label">Dates:</strong>{" "}
              {dateSummary}
            </Text>
          ) : null}

          {hasTasks ? (
            <div className="lifeos-project-details-header__task-progress">
              <Text size="sm" tone="secondary" className="lifeos-project-details-header__fact">
                <strong className="lifeos-project-details-header__fact-label">Progress:</strong>{" "}
                {taskProgressLabel}
              </Text>
              <ProgressBar
                value={project.completedTasksCount}
                max={project.totalTasksCount}
                label={`${project.name} progress`}
                className="lifeos-project-details-header__progress-bar"
              />
            </div>
          ) : (
            <Text size="sm" tone="secondary" className="lifeos-project-details-header__fact">
              <strong className="lifeos-project-details-header__fact-label">Tasks:</strong> No tasks
            </Text>
          )}

          {formattedEstimate ? (
            <Text tone="secondary" size="sm" className="lifeos-project-details-header__fact">
              <strong className="lifeos-project-details-header__fact-label">Estimate:</strong>{" "}
              {formattedEstimate}
            </Text>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

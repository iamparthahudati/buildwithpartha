import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Plus,
  Edit3,
  User,
  Tag,
  Activity,
  ListTodo,
  type LucideIcon,
} from "lucide-react";

import {
  Badge,
  Button,
  Heading,
  Icon,
  ProgressBar,
  SkeletonCard,
  Surface,
  Text,
  Link,
  PRIORITY_TONE,
  TASK_STATUS_TONE,
  type BadgeTone,
  type ProgressTone,
} from "@components/ui";
import { EmptyState, ErrorState } from "@components/feedback";
import {
  ActivityFeed,
  BarChart,
  ChartFrame,
  DataTable,
  DonutChart,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type ActivityEvent as NavigationActivityEvent,
  type ActivityFeedStatus,
  type ActivityObjectRef,
  type ChartDatum,
  type DataTableColumn,
} from "@components/navigation";
import { formatLocalDate, todayLocalDate, compareLocalDates } from "@lib/localDateTime";

import type { Project, ProjectPriority, ProjectHealth } from "../model/project";
import "./project-overview.css";

export interface ProjectOverviewTask {
  readonly id: string;
  readonly title: string;
  readonly status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  readonly priority: "P1" | "P2" | "P3" | "P4";
  readonly dueDate?: string | null;
  readonly assigneeName?: string | null;
  readonly href?: string;
}

export interface OverviewActivityItem {
  readonly id: string;
  readonly actorName: string;
  readonly action: string;
  readonly object?: ActivityObjectRef;
  readonly createdAt: string;
  readonly icon?: LucideIcon;
}

export interface ProjectOverviewProps {
  readonly project?: Project | null;
  readonly ownerName?: string;
  readonly estimatedHours?: number;
  readonly actualHours?: number;
  readonly labels?: readonly string[];
  readonly topTasks?: readonly ProjectOverviewTask[];
  readonly activityEvents?: readonly OverviewActivityItem[];
  readonly activityStatus?: ActivityFeedStatus;
  readonly statusBreakdown?: readonly ChartDatum[];
  readonly priorityBreakdown?: readonly ChartDatum[];
  readonly loading?: boolean;
  readonly empty?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly onTaskClick?: (taskId: string) => void;
  readonly onAddTask?: () => void;
  readonly onEditProject?: () => void;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly className?: string;
}

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
  NOT_SET: "Not set",
};

const HEALTH_TONES: Record<ProjectHealth, BadgeTone> = {
  ON_TRACK: "success",
  AT_RISK: "warning",
  OFF_TRACK: "danger",
  NOT_SET: "neutral",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};

const TASK_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  P1: "P1 — High",
  P2: "P2 — Medium",
  P3: "P3 — Low",
  P4: "P4 — Someday",
};

export function ProjectOverview({
  project,
  ownerName,
  estimatedHours,
  actualHours,
  labels = [],
  topTasks = [],
  activityEvents = [],
  activityStatus = { type: "ready" },
  statusBreakdown = [],
  priorityBreakdown = [],
  loading = false,
  empty = false,
  error,
  onRetry,
  onTaskClick,
  onAddTask,
  onEditProject,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  className = "",
}: ProjectOverviewProps) {
  if (error) {
    return (
      <div className={`lifeos-project-overview lifeos-project-overview--error ${className}`}>
        <ErrorState
          scope="region"
          title="Unable to load project overview"
          description={error}
          {...(onRetry ? { onRetry } : {})}
          retryLabel="Try again"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`lifeos-project-overview lifeos-project-overview--loading ${className}`}>
        <div className="lifeos-project-overview__metrics-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="lifeos-project-overview__charts-grid">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <div className="lifeos-project-overview__main-grid">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
      </div>
    );
  }

  if (empty || !project) {
    return (
      <div className={`lifeos-project-overview lifeos-project-overview--empty ${className}`}>
        <EmptyState
          variant="first-use"
          title="No project overview available"
          description="This project does not have any tasks or overview details recorded yet."
          primaryAction={
            onAddTask ? (
              <Button variant="primary" onClick={onAddTask}>
                <Icon icon={Plus} size="sm" decorative />
                <span>Add first task</span>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const totalTasks = project.totalTasksCount;
  const completedTasks = project.completedTasksCount;
  const progressPercent =
    totalTasks > 0
      ? Math.min(100, Math.max(0, Math.round((completedTasks / totalTasks) * 100)))
      : 0;

  const todayStr = todayLocalDate(timeZone, now);
  const isOverdue =
    project.status !== "COMPLETED" &&
    project.status !== "CANCELLED" &&
    project.deadlineDate != null &&
    compareLocalDates(project.deadlineDate, todayStr) < 0;

  const defaultStatusBreakdown: readonly ChartDatum[] = (() => {
    if (statusBreakdown.length > 0) return statusBreakdown;
    if (topTasks.length > 0) {
      const counts: Record<string, number> = {};
      for (const t of topTasks) {
        counts[t.status] = (counts[t.status] ?? 0) + 1;
      }
      return Object.entries(counts).map(([statusKey, count]) => ({
        id: `status-${statusKey}`,
        label: TASK_STATUS_LABELS[statusKey] ?? statusKey,
        value: count,
      }));
    }
    return (
      [
        { id: "status-completed", label: "Completed", value: completedTasks },
        {
          id: "status-in-progress",
          label: "In progress",
          value: Math.max(0, totalTasks - completedTasks),
        },
      ] as readonly ChartDatum[]
    ).filter((d) => d.value > 0);
  })();

  const defaultPriorityBreakdown: readonly ChartDatum[] = priorityBreakdown;

  // Map ActivityEvents for ActivityFeed component
  const navActivityEvents: readonly NavigationActivityEvent[] = activityEvents.map((evt) => ({
    id: evt.id,
    actorName: evt.actorName,
    action: evt.action,
    ...(evt.object ? { object: evt.object } : {}),
    createdAt: evt.createdAt,
    ...(evt.icon ? { icon: evt.icon } : {}),
  }));

  // Top tasks columns for DataTable
  const taskColumns: readonly DataTableColumn<ProjectOverviewTask>[] = [
    {
      key: "title",
      header: "Task",
      render: (task: ProjectOverviewTask) => (
        <div className="lifeos-project-overview__task-cell">
          {task.href ? (
            <Link href={task.href}>{task.title}</Link>
          ) : onTaskClick ? (
            <button
              type="button"
              className="lifeos-project-overview__task-button"
              onClick={() => onTaskClick(task.id)}
            >
              {task.title}
            </button>
          ) : (
            <Text weight="medium">{task.title}</Text>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (task: ProjectOverviewTask) => (
        <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
          {TASK_STATUS_LABELS[task.status] ?? task.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (task: ProjectOverviewTask) => (
        <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
          {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
        </Badge>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      render: (task: ProjectOverviewTask) =>
        task.dueDate ? (
          <Text size="sm">{formatLocalDate(task.dueDate, locale)}</Text>
        ) : (
          <Text size="sm" tone="muted">
            —
          </Text>
        ),
    },
    {
      key: "assignee",
      header: "Assignee",
      render: (task: ProjectOverviewTask) =>
        task.assigneeName ? (
          <Text size="sm">{task.assigneeName}</Text>
        ) : (
          <Text size="sm" tone="muted">
            Unassigned
          </Text>
        ),
    },
  ];

  const progressTone: ProgressTone = progressPercent === 100 ? "success" : "primary";

  return (
    <div className={`lifeos-project-overview ${className}`}>
      {/* 1. Metrics Grid */}
      <div className="lifeos-project-overview__metrics-grid">
        {/* Progress Card */}
        <Surface className="lifeos-project-overview__metric-card">
          <div className="lifeos-project-overview__card-header">
            <Text tone="secondary" size="xs" weight="medium">
              OVERALL PROGRESS
            </Text>
            <Icon
              icon={CheckCircle2}
              size="sm"
              decorative
              className="lifeos-project-overview__card-icon"
            />
          </div>
          <div className="lifeos-project-overview__metric-content">
            <div className="lifeos-project-overview__metric-value">{progressPercent}%</div>
            <ProgressBar
              value={progressPercent}
              tone={progressTone}
              label={`Project completion: ${progressPercent}%`}
            />
            <Text size="xs" tone="secondary">
              {completedTasks} of {totalTasks} tasks completed
            </Text>
          </div>
        </Surface>

        {/* Tasks Breakdown Card */}
        <Surface className="lifeos-project-overview__metric-card">
          <div className="lifeos-project-overview__card-header">
            <Text tone="secondary" size="xs" weight="medium">
              TASKS BREAKDOWN
            </Text>
            <Icon
              icon={ListTodo}
              size="sm"
              decorative
              className="lifeos-project-overview__card-icon"
            />
          </div>
          <div className="lifeos-project-overview__metric-content">
            <div className="lifeos-project-overview__metric-value">{totalTasks}</div>
            <div className="lifeos-project-overview__badges-wrap">
              <Badge tone="success">{completedTasks} Done</Badge>
              <Badge tone="info">{Math.max(0, totalTasks - completedTasks)} Open</Badge>
            </div>
            <Text size="xs" tone="secondary">
              Total recorded tasks in project
            </Text>
          </div>
        </Surface>

        {/* Timeline & Time Card */}
        <Surface className="lifeos-project-overview__metric-card">
          <div className="lifeos-project-overview__card-header">
            <Text tone="secondary" size="xs" weight="medium">
              TIMELINE & HOURS
            </Text>
            <Icon
              icon={Clock}
              size="sm"
              decorative
              className="lifeos-project-overview__card-icon"
            />
          </div>
          <div className="lifeos-project-overview__metric-content">
            {project.deadlineDate ? (
              <>
                <div className="lifeos-project-overview__metric-value">
                  {formatLocalDate(project.deadlineDate, locale)}
                </div>
                {isOverdue ? (
                  <Badge tone="danger">Overdue</Badge>
                ) : (
                  <Badge tone="neutral">
                    {project.startDate
                      ? `Starts ${formatLocalDate(project.startDate, locale)}`
                      : "Scheduled"}
                  </Badge>
                )}
              </>
            ) : (
              <div className="lifeos-project-overview__metric-value">No deadline</div>
            )}
            <Text size="xs" tone="secondary">
              {estimatedHours != null
                ? `${actualHours ?? 0}h logged / ${estimatedHours}h estimated`
                : "No hour estimate recorded"}
            </Text>
          </div>
        </Surface>

        {/* Health Card */}
        <Surface className="lifeos-project-overview__metric-card">
          <div className="lifeos-project-overview__card-header">
            <Text tone="secondary" size="xs" weight="medium">
              PROJECT HEALTH
            </Text>
            <Icon
              icon={AlertTriangle}
              size="sm"
              decorative
              className="lifeos-project-overview__card-icon"
            />
          </div>
          <div className="lifeos-project-overview__metric-content">
            <div className="lifeos-project-overview__health-row">
              <Badge tone={HEALTH_TONES[project.health]}>{HEALTH_LABELS[project.health]}</Badge>
            </div>
            <Text size="xs" tone="secondary">
              {project.health === "ON_TRACK"
                ? "Schedule and deliverables are on track"
                : project.health === "AT_RISK"
                  ? "At risk: potential deadline or blocker issues"
                  : project.health === "OFF_TRACK"
                    ? "Off track: immediate attention needed"
                    : "Health assessment not recorded"}
            </Text>
          </div>
        </Surface>
      </div>

      {/* 2. Charts Section */}
      <div className="lifeos-project-overview__charts-grid">
        <ChartFrame
          title="Tasks by status"
          status={defaultStatusBreakdown.length > 0 ? "ready" : "empty"}
          emptyTitle="No status data"
          emptyDescription="Add tasks to visualize status breakdown."
          dataTable={
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Count</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {defaultStatusBreakdown.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell>{item.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <DonutChart data={defaultStatusBreakdown} label="Tasks by status" locale={locale} />
        </ChartFrame>

        <ChartFrame
          title="Tasks by priority"
          status={defaultPriorityBreakdown.length > 0 ? "ready" : "empty"}
          emptyTitle="No priority data"
          emptyDescription="Assign priorities to tasks to visualize breakdown."
          dataTable={
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Priority</TableHeaderCell>
                  <TableHeaderCell>Count</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {defaultPriorityBreakdown.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell>{item.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <BarChart data={defaultPriorityBreakdown} label="Tasks by priority" locale={locale} />
        </ChartFrame>
      </div>

      {/* 3. Main Sections Grid */}
      <div className="lifeos-project-overview__main-grid">
        {/* Top Tasks */}
        <Surface className="lifeos-project-overview__section-card">
          <div className="lifeos-project-overview__section-header">
            <Heading level={2} size="sm">
              Top tasks
            </Heading>
            {onAddTask && (
              <Button variant="ghost" size="sm" onClick={onAddTask}>
                <Icon icon={Plus} size="sm" decorative />
                <span>Add task</span>
              </Button>
            )}
          </div>
          {topTasks.length > 0 ? (
            <DataTable
              label="Top project tasks"
              data-testid="top-tasks-table"
              rows={topTasks}
              columns={taskColumns}
              getRowId={(task: ProjectOverviewTask) => task.id}
              emptyTitle="No open tasks"
            />
          ) : (
            <EmptyState
              variant="first-use"
              title="No open tasks"
              description="There are currently no tasks listed for this project."
              primaryAction={
                onAddTask ? (
                  <Button variant="primary" size="sm" onClick={onAddTask}>
                    <Icon icon={Plus} size="sm" decorative />
                    <span>Add task</span>
                  </Button>
                ) : undefined
              }
            />
          )}
        </Surface>

        {/* Right Details Column: About + Activity */}
        <div className="lifeos-project-overview__side-column">
          {/* About Project */}
          <Surface className="lifeos-project-overview__section-card">
            <div className="lifeos-project-overview__section-header">
              <Heading level={2} size="sm">
                About project
              </Heading>
              {onEditProject && (
                <Button variant="ghost" size="sm" onClick={onEditProject}>
                  <Icon icon={Edit3} size="sm" decorative />
                  <span>Edit</span>
                </Button>
              )}
            </div>
            <div className="lifeos-project-overview__about-body">
              <Text tone={project.description ? "default" : "muted"}>
                {project.description || "No description provided for this project."}
              </Text>

              {labels.length > 0 && (
                <div className="lifeos-project-overview__labels-block">
                  <div className="lifeos-project-overview__subhead">
                    <Icon icon={Tag} size="sm" decorative />
                    <Text size="xs" weight="medium" tone="secondary">
                      LABELS
                    </Text>
                  </div>
                  <div className="lifeos-project-overview__badges-wrap">
                    {labels.map((label) => (
                      <Badge key={label} tone="neutral">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="lifeos-project-overview__metadata-block">
                {ownerName && (
                  <div className="lifeos-project-overview__meta-item">
                    <Icon icon={User} size="sm" decorative />
                    <Text size="xs" tone="secondary">
                      Owner: {ownerName}
                    </Text>
                  </div>
                )}
                {project.startDate && (
                  <div className="lifeos-project-overview__meta-item">
                    <Icon icon={Clock} size="sm" decorative />
                    <Text size="xs" tone="secondary">
                      Start date: {formatLocalDate(project.startDate, locale)}
                    </Text>
                  </div>
                )}
                <div className="lifeos-project-overview__meta-item">
                  <Icon icon={FolderKanban} size="sm" decorative />
                  <Text size="xs" tone="secondary">
                    Updated: {formatLocalDate(project.updatedAt.slice(0, 10), locale)}
                  </Text>
                </div>
              </div>
            </div>
          </Surface>

          {/* Activity Feed */}
          <Surface className="lifeos-project-overview__section-card">
            <div className="lifeos-project-overview__section-header">
              <Heading level={2} size="sm">
                Recent activity
              </Heading>
              <Icon
                icon={Activity}
                size="sm"
                decorative
                className="lifeos-project-overview__card-icon"
              />
            </div>
            <ActivityFeed
              label="Recent project activity"
              events={navActivityEvents}
              locale={locale}
              timeZone={timeZone}
              status={activityStatus}
              emptyTitle="No recent activity"
              emptyDescription="Activity history for this project will appear here."
            />
          </Surface>
        </div>
      </div>
    </div>
  );
}

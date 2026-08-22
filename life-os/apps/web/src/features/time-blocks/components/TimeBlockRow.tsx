import {
  BookOpen,
  Brain,
  Briefcase,
  Check,
  Clock3,
  Dumbbell,
  Flag,
  Folder,
  FolderKanban,
  Heart,
  Home,
  Lightbulb,
  MoreHorizontal,
  Palette,
  Play,
  Rocket,
  Star,
  Target,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Badge,
  Button,
  Icon,
  IconButton,
  Link,
  Skeleton,
  Surface,
  Text,
  VisuallyHidden,
} from "@components/ui";
import { InlineMessage } from "@components/feedback";
import { Menu, type MenuItemDescriptor } from "@components/navigation";
import { COLOR_SWATCHES, ICON_OPTIONS } from "@components/forms";
import { localTimeToMinutes, nowLocalTime, todayLocalDate } from "@lib/localDateTime";

import type { TimeBlock, TimeBlockStatus } from "../model/timeBlock";
import { formatTimeBlockDuration, formatTimeBlockRange } from "../model/timeBlock";
import "./time-block-row.css";

export interface TimeBlockRowProps {
  readonly timeBlock?: TimeBlock;
  readonly loading?: boolean;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly isCurrent?: boolean;
  readonly hasConflict?: boolean;
  readonly conflictDescriptions?: readonly string[];
  readonly startingFocus?: boolean;
  readonly startFocusDisabled?: boolean;
  readonly startFocusDisabledReason?: string;
  readonly onStartFocus?: () => void;
  readonly onComplete?: () => void;
  readonly onEdit?: () => void;
  readonly onDuplicate?: () => void;
  readonly onDelete?: () => void;
  readonly href?: string;
  readonly className?: string;
}

const STATUS_LABELS: Record<TimeBlockStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_TONES: Record<TimeBlockStatus, "neutral" | "info" | "success" | "danger"> = {
  SCHEDULED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const ICON_NAME_MAP: Record<string, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  target: Target,
  flag: Flag,
  star: Star,
  "book-open": BookOpen,
  book: BookOpen,
  home: Home,
  heart: Heart,
  dumbbell: Dumbbell,
  fitness: Dumbbell,
  palette: Palette,
  creative: Palette,
  rocket: Rocket,
  launch: Rocket,
  lightbulb: Lightbulb,
  idea: Lightbulb,
  brain: Brain,
  meeting: Users,
  users: Users,
  user: User,
  clock: Clock3,
};

function resolveCategoryColor(colorName?: string | null): string {
  if (!colorName) return "var(--lifeos-chart-1)";
  if (colorName.startsWith("var(")) return colorName;
  for (let i = 0; i < COLOR_SWATCHES.length; i++) {
    const swatch = COLOR_SWATCHES[i];
    if (swatch?.name === colorName) {
      return `var(${swatch.token})`;
    }
  }
  return "var(--lifeos-chart-1)";
}

function resolveCategoryIcon(iconName?: string | null, categoryText?: string | null): LucideIcon {
  if (iconName) {
    for (let i = 0; i < ICON_OPTIONS.length; i++) {
      const option = ICON_OPTIONS[i];
      if (option?.name === iconName) {
        return option.icon;
      }
    }
    const mapped = ICON_NAME_MAP[iconName.toLowerCase()];
    if (mapped) return mapped;
  }
  if (categoryText) {
    const lower = categoryText.toLowerCase();
    if (lower.includes("meeting") || lower.includes("sync")) return Users;
    if (lower.includes("deep") || lower.includes("focus") || lower.includes("code")) return Brain;
    if (lower.includes("health") || lower.includes("workout")) return Dumbbell;
    if (lower.includes("personal") || lower.includes("life")) return User;
    if (lower.includes("work") || lower.includes("office")) return Briefcase;
    if (lower.includes("project")) return FolderKanban;
  }
  return Clock3;
}

export function TimeBlockRow({
  timeBlock,
  loading = false,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  isCurrent: explicitIsCurrent,
  hasConflict: explicitHasConflict,
  conflictDescriptions,
  startingFocus = false,
  startFocusDisabled = false,
  startFocusDisabledReason,
  onStartFocus,
  onComplete,
  onEdit,
  onDuplicate,
  onDelete,
  href,
  className,
}: TimeBlockRowProps) {
  const rootClass = ["lifeos-time-block-row", className].filter(Boolean).join(" ");

  if (loading || !timeBlock) {
    return (
      <Surface
        as="div"
        bordered
        padding="sm"
        className={[rootClass, "lifeos-time-block-row--loading"].join(" ")}
      >
        <VisuallyHidden>Loading time block.</VisuallyHidden>
        <div className="lifeos-time-block-row__left">
          <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
          <div className="lifeos-time-block-row__skeleton-content">
            <Skeleton shape="line" width="12rem" height="1.25rem" />
            <Skeleton shape="line" width="8rem" height="0.875rem" />
          </div>
        </div>
        <div className="lifeos-time-block-row__center">
          <Skeleton shape="line" width="10rem" height="1.25rem" />
          <Skeleton shape="line" width="6rem" height="1rem" />
        </div>
        <div className="lifeos-time-block-row__right">
          <Skeleton shape="line" width="5rem" height="2rem" />
          <Skeleton shape="circle" width="2rem" height="2rem" />
        </div>
      </Surface>
    );
  }

  const categoryName =
    typeof timeBlock.category === "string"
      ? timeBlock.category
      : (timeBlock.category?.name ?? null);

  const categoryColorName =
    timeBlock.categoryColor ??
    (typeof timeBlock.category === "object" ? timeBlock.category?.color : null);

  const categoryIconName =
    timeBlock.categoryIcon ??
    (typeof timeBlock.category === "object" ? timeBlock.category?.icon : null);

  const categoryColor = resolveCategoryColor(categoryColorName);
  const CategoryIcon = resolveCategoryIcon(categoryIconName, categoryName);

  const isCompleted = timeBlock.status === "COMPLETED" || Boolean(timeBlock.completed);
  const isCancelled = timeBlock.status === "CANCELLED";

  let isCurrent = explicitIsCurrent;
  if (isCurrent === undefined) {
    if (timeBlock.isCurrent) {
      isCurrent = true;
    } else if (timeBlock.status === "IN_PROGRESS") {
      isCurrent = true;
    } else if (timeBlock.date && !isCompleted && !isCancelled) {
      const today = todayLocalDate(timeZone, now);
      if (timeBlock.date === today) {
        const currentWallTime = nowLocalTime(timeZone, now);
        const currentMins = localTimeToMinutes(currentWallTime);
        const startMins = localTimeToMinutes(timeBlock.startTime);
        const endMins = localTimeToMinutes(timeBlock.endTime);
        isCurrent = currentMins >= startMins && currentMins < endMins;
      } else {
        isCurrent = false;
      }
    } else {
      isCurrent = false;
    }
  }

  const conflicts = conflictDescriptions ?? timeBlock.conflictDescriptions ?? [];
  const hasConflict = explicitHasConflict ?? timeBlock.hasConflict ?? conflicts.length > 0;

  const projectName = timeBlock.project?.name ?? timeBlock.projectName ?? null;
  const projectHref =
    timeBlock.project?.href ??
    (timeBlock.projectId ? `/life-os/app/projects/${timeBlock.projectId}` : undefined);

  const taskTitle = timeBlock.task?.title ?? timeBlock.taskTitle ?? null;
  const taskHref =
    timeBlock.task?.href ??
    (timeBlock.taskId ? `/life-os/app/tasks/${timeBlock.taskId}` : undefined);

  const blockHref = href ?? timeBlock.href ?? `/life-os/app/time-blocks/${timeBlock.id}`;
  const timeRangeText = formatTimeBlockRange(timeBlock.startTime, timeBlock.endTime, locale);
  const durationText = formatTimeBlockDuration(timeBlock.startTime, timeBlock.endTime, locale);

  const menuItems: MenuItemDescriptor[] = [];

  const canFocus = !isCompleted && !isCancelled;
  if (onStartFocus && canFocus) {
    menuItems.push({
      type: "item",
      id: "start-focus",
      label: "Start focus",
      onSelect: onStartFocus,
      disabled: startFocusDisabled,
    });
  }

  if (onComplete && !isCompleted && !isCancelled) {
    menuItems.push({
      type: "item",
      id: "complete",
      label: "Mark completed",
      onSelect: onComplete,
    });
  }

  if (onEdit) {
    menuItems.push({
      type: "item",
      id: "edit",
      label: "Edit time block",
      onSelect: onEdit,
    });
  }

  if (onDuplicate) {
    menuItems.push({
      type: "item",
      id: "duplicate",
      label: "Duplicate time block",
      onSelect: onDuplicate,
    });
  }

  if (onDelete) {
    menuItems.push({
      type: "item",
      id: "delete",
      label: "Delete time block",
      onSelect: onDelete,
      destructive: true,
    });
  }

  return (
    <Surface
      as="div"
      bordered
      padding="sm"
      className={[
        rootClass,
        isCurrent && "lifeos-time-block-row--current",
        hasConflict && "lifeos-time-block-row--conflict",
        isCompleted && "lifeos-time-block-row--completed",
        isCancelled && "lifeos-time-block-row--cancelled",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="lifeos-time-block-row__left">
        <div
          className="lifeos-time-block-row__swatch"
          style={{ backgroundColor: categoryColor }}
          aria-hidden="true"
        >
          <Icon icon={CategoryIcon} decorative size="md" />
        </div>
        <div className="lifeos-time-block-row__identity">
          <div className="lifeos-time-block-row__title-row">
            <Link
              href={blockHref}
              className="lifeos-time-block-row__title"
              aria-label={`Open time block: ${timeBlock.title}`}
            >
              {timeBlock.title}
            </Link>
          </div>

          <div className="lifeos-time-block-row__context">
            {categoryName ? (
              <Text inline tone="secondary" size="xs">
                {categoryName}
              </Text>
            ) : null}

            {categoryName && (projectName || taskTitle) ? (
              <span className="lifeos-time-block-row__dot-separator" aria-hidden="true">
                ·
              </span>
            ) : null}

            {projectName ? (
              <div className="lifeos-time-block-row__context-item">
                <Icon icon={FolderKanban} decorative size="sm" />
                {projectHref ? (
                  <Link href={projectHref} inline quiet>
                    {projectName}
                  </Link>
                ) : (
                  <Text inline tone="secondary" size="xs">
                    {projectName}
                  </Text>
                )}
              </div>
            ) : null}

            {projectName && taskTitle ? (
              <span className="lifeos-time-block-row__dot-separator" aria-hidden="true">
                ·
              </span>
            ) : null}

            {taskTitle ? (
              <div className="lifeos-time-block-row__context-item">
                <Icon icon={Check} decorative size="sm" />
                {taskHref ? (
                  <Link href={taskHref} inline quiet>
                    {taskTitle}
                  </Link>
                ) : (
                  <Text inline tone="secondary" size="xs">
                    {taskTitle}
                  </Text>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="lifeos-time-block-row__center">
        <div className="lifeos-time-block-row__time-info">
          <Icon icon={Clock3} decorative size="sm" />
          <Text inline size="xs" weight="medium">
            {timeRangeText}
          </Text>
          <Text inline tone="muted" size="xs">
            ({durationText})
          </Text>
        </div>

        <div className="lifeos-time-block-row__badges">
          <Badge tone={STATUS_TONES[timeBlock.status]}>{STATUS_LABELS[timeBlock.status]}</Badge>

          {isCurrent ? <Badge tone="primary">Current</Badge> : null}

          {hasConflict ? <Badge tone="danger">Conflict</Badge> : null}
        </div>

        {conflicts.length > 0 ? (
          <div className="lifeos-time-block-row__conflicts">
            {conflicts.map((desc, idx) => (
              <InlineMessage key={idx} tone="warning">
                {desc}
              </InlineMessage>
            ))}
          </div>
        ) : null}
      </div>

      <div className="lifeos-time-block-row__right">
        <div className="lifeos-time-block-row__actions">
          {onStartFocus && canFocus ? (
            <Button
              size="sm"
              variant="primary"
              iconStart={Play}
              loading={startingFocus}
              loadingLabel={`Starting focus for ${timeBlock.title}`}
              disabled={startFocusDisabled}
              {...(startFocusDisabled && startFocusDisabledReason
                ? { title: startFocusDisabledReason }
                : {})}
              onClick={onStartFocus}
            >
              Start focus
            </Button>
          ) : null}

          {onComplete && !isCompleted && !isCancelled ? (
            <Button size="sm" variant="secondary" iconStart={Check} onClick={onComplete}>
              Complete
            </Button>
          ) : null}

          {menuItems.length > 0 ? (
            <Menu
              trigger={
                <IconButton
                  icon={MoreHorizontal}
                  label="Time block actions"
                  variant="ghost"
                  size="sm"
                />
              }
              items={menuItems}
              label="Time block actions"
              align="end"
            />
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

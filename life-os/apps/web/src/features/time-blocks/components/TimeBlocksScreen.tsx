import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Target, PieChart, RotateCcw } from "lucide-react";

import { PageHeader } from "@components/navigation";
import { Alert, ConfirmDialog } from "@components/feedback";
import { Badge, Button, IconButton, Surface, Text } from "@components/ui";
import {
  addLocalDays,
  todayLocalDate,
  formatLocalDate,
  type LocalDate,
  type LocalTime,
} from "@lib/localDateTime";

import type { TimeBlock } from "../model/timeBlock";
import { DayTimeline, type DayTimelineDensity, type DayTimelineViewMode } from "./DayTimeline";
import { TimeSummary } from "./TimeSummary";
import {
  TimeBlockForm,
  type TimeBlockFormData,
  type TimeBlockTaskOption,
  type TimeBlockProjectOption,
  type TimeBlockCategoryOption,
} from "./TimeBlockForm";
import {
  MOCK_TIME_BLOCKS,
  MOCK_TIME_BLOCK_CATEGORIES,
  MOCK_TIME_BLOCK_PROJECTS,
  MOCK_TIME_BLOCK_TASKS,
  MOCK_TIME_SUMMARY_CATEGORIES,
} from "../model/mockTimeBlocks";
import {
  formatTimeBlocksDateLabel,
  formatTimeBlocksWeekLabel,
  getWeekDaysForDate,
  filterBlocksByDate,
  type TimeBlocksViewMode,
} from "../model/timeBlocksScreen";
import "./time-blocks-screen.css";

export interface TimeBlocksScreenProps {
  readonly initialBlocks?: readonly TimeBlock[];
  readonly blocks?: readonly TimeBlock[];
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly timeZone?: string;
  readonly locale?: string;
  readonly now?: Date;
  readonly isOffline?: boolean;
  readonly dstNotice?: string | null;
  readonly initialViewMode?: TimeBlocksViewMode;
  readonly initialDate?: LocalDate;
  readonly tasks?: readonly TimeBlockTaskOption[];
  readonly projects?: readonly TimeBlockProjectOption[];
  readonly categories?: readonly TimeBlockCategoryOption[];
  readonly onRetry?: () => void;
  readonly onDateChange?: (date: LocalDate) => void;
  readonly onViewModeChange?: (viewMode: TimeBlocksViewMode) => void;
  readonly onCreateBlockSubmit?: (data: TimeBlockFormData) => Promise<void> | void;
  readonly onEditBlockSubmit?: (data: TimeBlockFormData) => Promise<void> | void;
  readonly onMoveBlock?: (
    blockId: string,
    newStart: LocalTime,
    newEnd: LocalTime,
  ) => Promise<void> | void;
  readonly onResizeBlock?: (blockId: string, newEnd: LocalTime) => Promise<void> | void;
  readonly onCompleteBlock?: (block: TimeBlock) => Promise<void> | void;
  readonly onDuplicateBlock?: (block: TimeBlock) => Promise<void> | void;
  readonly onDeleteBlockConfirm?: (block: TimeBlock) => Promise<void> | void;
  readonly onStartFocus?: (block: TimeBlock) => void;
  readonly className?: string;
}

export function TimeBlocksScreen({
  initialBlocks,
  blocks: controlledBlocks,
  loading = false,
  error = null,
  timeZone = "UTC",
  locale = "en-US",
  now = new Date(),
  isOffline = false,
  dstNotice = null,
  initialViewMode = "day",
  initialDate,
  tasks = MOCK_TIME_BLOCK_TASKS,
  projects = MOCK_TIME_BLOCK_PROJECTS,
  categories = MOCK_TIME_BLOCK_CATEGORIES,
  onRetry,
  onDateChange,
  onViewModeChange,
  onCreateBlockSubmit,
  onEditBlockSubmit,
  onMoveBlock,
  onResizeBlock,
  onCompleteBlock,
  onDuplicateBlock,
  onDeleteBlockConfirm,
  onStartFocus,
  className,
}: TimeBlocksScreenProps) {
  const today = todayLocalDate(timeZone, now);
  const [currentDate, setCurrentDate] = useState<LocalDate>(initialDate ?? today);
  const [viewMode, setViewMode] = useState<TimeBlocksViewMode>(initialViewMode);
  const [showSummary, setShowSummary] = useState<boolean>(true);
  const [focusModeOnly, setFocusModeOnly] = useState<boolean>(false);
  const [timelineDensity, setTimelineDensity] = useState<DayTimelineDensity>("comfortable");
  const [timelineViewMode, setTimelineViewMode] = useState<DayTimelineViewMode>("auto");

  const [prevInitialDate, setPrevInitialDate] = useState(initialDate);
  const [prevInitialViewMode, setPrevInitialViewMode] = useState(initialViewMode);

  if (initialDate !== undefined && initialDate !== prevInitialDate) {
    setPrevInitialDate(initialDate);
    setCurrentDate(initialDate);
  }

  if (initialViewMode !== undefined && initialViewMode !== prevInitialViewMode) {
    setPrevInitialViewMode(initialViewMode);
    setViewMode(initialViewMode);
  }

  // Local blocks state (fallback when controlledBlocks is omitted)
  const [internalBlocks, setInternalBlocks] = useState<readonly TimeBlock[]>(
    initialBlocks ?? MOCK_TIME_BLOCKS,
  );
  const activeBlocks = controlledBlocks ?? internalBlocks;

  // Dialog States
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitialValues, setFormInitialValues] = useState<
    Partial<TimeBlockFormData> | TimeBlock | null
  >(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [blockToDelete, setBlockToDelete] = useState<TimeBlock | null>(null);

  // Date Navigation handlers
  const handleUpdateDate = (nextDate: LocalDate) => {
    setCurrentDate(nextDate);
    onDateChange?.(nextDate);
  };

  const handleUpdateViewMode = (nextMode: TimeBlocksViewMode) => {
    setViewMode(nextMode);
    onViewModeChange?.(nextMode);
  };

  const handlePrevDate = () => {
    const delta = viewMode === "week" ? -7 : -1;
    handleUpdateDate(addLocalDays(currentDate, delta));
  };

  const handleNextDate = () => {
    const delta = viewMode === "week" ? 7 : 1;
    handleUpdateDate(addLocalDays(currentDate, delta));
  };

  const handleTodayClick = () => {
    handleUpdateDate(today);
  };

  // Block CRUD handlers
  const handleOpenCreateForm = (startTime: LocalTime = "09:00", endTime: LocalTime = "10:00") => {
    setFormMode("create");
    setFormInitialValues({
      date: currentDate,
      startTime,
      endTime,
      timeZone,
      category: "Focus",
      status: "SCHEDULED",
    });
    setFormOpen(true);
  };

  const handleOpenEditForm = (block: TimeBlock) => {
    setFormMode("edit");
    setFormInitialValues(block);
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData: TimeBlockFormData) => {
    if (formMode === "create") {
      if (onCreateBlockSubmit) {
        await onCreateBlockSubmit(formData);
      } else {
        const newBlock: TimeBlock = {
          id: `tb-created-${Date.now()}`,
          title: formData.title,
          category: formData.category,
          categoryColor: categories.find((c) => c.value === formData.category)?.color ?? "blue",
          categoryIcon: categories.find((c) => c.value === formData.category)?.icon ?? "target",
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          timeZone: formData.timeZone,
          status: formData.status,
          notes: formData.notes,
          projectId: formData.projectId,
          taskId: formData.taskId,
        };
        setInternalBlocks((prev) => [...prev, newBlock]);
      }
    } else {
      if (onEditBlockSubmit) {
        await onEditBlockSubmit(formData);
      } else {
        setInternalBlocks((prev) =>
          prev.map((b) =>
            b.id === formData.id
              ? {
                  ...b,
                  title: formData.title,
                  category: formData.category,
                  date: formData.date,
                  startTime: formData.startTime,
                  endTime: formData.endTime,
                  timeZone: formData.timeZone,
                  status: formData.status,
                  notes: formData.notes,
                  projectId: formData.projectId,
                  taskId: formData.taskId,
                }
              : b,
          ),
        );
      }
    }
    setFormOpen(false);
  };

  const handleCompleteBlock = async (block: TimeBlock) => {
    if (onCompleteBlock) {
      await onCompleteBlock(block);
    } else {
      setInternalBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, status: "COMPLETED", completed: true } : b)),
      );
    }
  };

  const handleDuplicateBlock = async (block: TimeBlock) => {
    if (onDuplicateBlock) {
      await onDuplicateBlock(block);
    } else {
      const duplicated: TimeBlock = {
        ...block,
        id: `tb-dup-${Date.now()}`,
        title: `${block.title} (Copy)`,
        status: "SCHEDULED",
        completed: false,
      };
      setInternalBlocks((prev) => [...prev, duplicated]);
    }
  };

  const handleOpenDeleteConfirm = (block: TimeBlock) => {
    setBlockToDelete(block);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blockToDelete) return;
    if (onDeleteBlockConfirm) {
      await onDeleteBlockConfirm(blockToDelete);
    } else {
      setInternalBlocks((prev) => prev.filter((b) => b.id !== blockToDelete.id));
    }
    setDeleteConfirmOpen(false);
    setBlockToDelete(null);
  };

  const handleMoveBlock = async (blockId: string, newStart: LocalTime, newEnd: LocalTime) => {
    if (onMoveBlock) {
      await onMoveBlock(blockId, newStart, newEnd);
    } else {
      setInternalBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, startTime: newStart, endTime: newEnd } : b)),
      );
    }
  };

  const handleResizeBlock = async (blockId: string, newEnd: LocalTime) => {
    if (onResizeBlock) {
      await onResizeBlock(blockId, newEnd);
    } else {
      setInternalBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, endTime: newEnd } : b)),
      );
    }
  };

  // Filter blocks for active view
  const currentDayBlocks = useMemo(
    () => filterBlocksByDate(activeBlocks, currentDate),
    [activeBlocks, currentDate],
  );

  const displayedBlocks = useMemo(() => {
    if (!focusModeOnly) return currentDayBlocks;
    return currentDayBlocks.filter(
      (b) =>
        b.category === "Focus" || (typeof b.category === "object" && b.category?.name === "Focus"),
    );
  }, [currentDayBlocks, focusModeOnly]);

  const hasConflictInDay = useMemo(
    () => displayedBlocks.some((b) => Boolean(b.hasConflict)),
    [displayedBlocks],
  );

  const weekDays = useMemo(() => getWeekDaysForDate(currentDate), [currentDate]);

  const formattedDateLabel = useMemo(
    () => formatTimeBlocksDateLabel(currentDate, locale),
    [currentDate, locale],
  );

  const formattedWeekLabel = useMemo(
    () => formatTimeBlocksWeekLabel(currentDate, locale),
    [currentDate, locale],
  );

  const rootClass = ["lifeos-time-blocks-screen", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      {/* Page Header */}
      <PageHeader
        title="Time Blocks"
        description="Plan, track, and align your daily and weekly time blocks with local timezone support."
        primaryAction={
          <Button
            variant="primary"
            size="md"
            iconStart={Plus}
            onClick={() => handleOpenCreateForm("09:00", "10:00")}
          >
            Add block
          </Button>
        }
      />

      {/* Control Bar: Navigation, View Mode, Toggles */}
      <Surface as="div" bordered padding="md" className="lifeos-time-blocks-screen__controls-bar">
        <div className="lifeos-time-blocks-screen__date-nav">
          <IconButton
            icon={ChevronLeft}
            label={viewMode === "week" ? "Previous week" : "Previous day"}
            variant="ghost"
            size="sm"
            onClick={handlePrevDate}
          />

          <Button
            variant={currentDate === today ? "secondary" : "ghost"}
            size="sm"
            onClick={handleTodayClick}
          >
            Today
          </Button>

          <IconButton
            icon={ChevronRight}
            label={viewMode === "week" ? "Next week" : "Next day"}
            variant="ghost"
            size="sm"
            onClick={handleNextDate}
          />

          <Text weight="semibold" size="md" className="lifeos-time-blocks-screen__date-text">
            {viewMode === "week" ? formattedWeekLabel : formattedDateLabel}
          </Text>
        </div>

        <div className="lifeos-time-blocks-screen__toggles-group">
          {/* Day / Week View Switch */}
          <div
            className="lifeos-time-blocks-screen__view-switcher"
            role="group"
            aria-label="View mode selector"
          >
            <Button
              variant={viewMode === "day" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleUpdateViewMode("day")}
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleUpdateViewMode("week")}
            >
              Week
            </Button>
          </div>

          {/* Feature Toggles */}
          <Button
            variant={focusModeOnly ? "primary" : "ghost"}
            size="sm"
            iconStart={Target}
            onClick={() => setFocusModeOnly(!focusModeOnly)}
            aria-pressed={focusModeOnly}
          >
            Focus mode
          </Button>

          <Button
            variant={showSummary ? "secondary" : "ghost"}
            size="sm"
            iconStart={PieChart}
            onClick={() => setShowSummary(!showSummary)}
            aria-pressed={showSummary}
          >
            Summary
          </Button>
        </div>
      </Surface>

      {/* Alert Banners */}
      {isOffline ? (
        <Alert
          tone="warning"
          heading="Working offline"
          className="lifeos-time-blocks-screen__alert"
        >
          Changes will be saved as device drafts until reconnected to the server.
        </Alert>
      ) : null}

      {dstNotice ? (
        <Alert
          tone="info"
          heading="Daylight Saving Time transition"
          className="lifeos-time-blocks-screen__alert"
        >
          {dstNotice}
        </Alert>
      ) : null}

      {hasConflictInDay ? (
        <Alert
          tone="warning"
          heading="Overlap conflict detected"
          className="lifeos-time-blocks-screen__alert"
        >
          One or more time blocks overlap. Adjust start/end times or enable explicit overlap
          override.
        </Alert>
      ) : null}

      {error ? (
        <Alert
          tone="danger"
          heading="Failed to load time blocks"
          action={
            onRetry ? (
              <Button variant="secondary" size="sm" iconStart={RotateCcw} onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
          className="lifeos-time-blocks-screen__alert"
        >
          {error}
        </Alert>
      ) : null}

      {/* Main Content Layout */}
      {viewMode === "day" ? (
        <div
          className={[
            "lifeos-time-blocks-screen__grid-layout",
            showSummary && "lifeos-time-blocks-screen__grid-layout--with-sidebar",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Main Timeline Column */}
          <div className="lifeos-time-blocks-screen__main-col">
            <DayTimeline
              blocks={displayedBlocks}
              loading={loading}
              date={currentDate}
              timeZone={timeZone}
              now={now}
              locale={locale}
              density={timelineDensity}
              onDensityChange={setTimelineDensity}
              viewMode={timelineViewMode}
              onViewModeChange={setTimelineViewMode}
              onCreateBlock={handleOpenCreateForm}
              onEditBlock={handleOpenEditForm}
              onCompleteBlock={handleCompleteBlock}
              onDeleteBlock={handleOpenDeleteConfirm}
              onDuplicateBlock={handleDuplicateBlock}
              {...(onStartFocus ? { onStartFocusBlock: onStartFocus } : {})}
              onMoveBlock={handleMoveBlock}
              onResizeBlock={handleResizeBlock}
            />
          </div>

          {/* Summary Sidebar Column */}
          {showSummary ? (
            <aside
              className="lifeos-time-blocks-screen__sidebar-col"
              aria-label="Time summary statistics"
            >
              <TimeSummary
                metricsStatus={
                  loading
                    ? { type: "loading" }
                    : {
                        type: "ready",
                        counts: {
                          focusMinutes: 270,
                          breakMinutes: 60,
                          personalMinutes: 60,
                          unscheduledMinutes: 60,
                        },
                      }
                }
                breakdownStatus={loading ? "loading" : "ready"}
                categories={MOCK_TIME_SUMMARY_CATEGORIES}
                goalStatus={loading ? "loading" : "ready"}
                targetMinutes={240}
                actualMinutes={270}
                upcomingStatus={loading ? "loading" : "ready"}
                upcomingBlocks={displayedBlocks.filter((b) => b.status === "SCHEDULED")}
                locale={locale}
                timeZone={timeZone}
                now={now}
                onCreateBlock={() => handleOpenCreateForm("09:00", "10:00")}
                onEditBlock={handleOpenEditForm}
                onCompleteBlock={handleCompleteBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleOpenDeleteConfirm}
                {...(onStartFocus
                  ? { onStartFocus: (b) => (b ? onStartFocus(b) : undefined) }
                  : {})}
                {...(onRetry ? { onRetry } : {})}
              />
            </aside>
          ) : null}
        </div>
      ) : (
        /* Week View Composition */
        <div className="lifeos-time-blocks-screen__week-layout">
          {/* Week Strip Selector */}
          <div className="lifeos-time-blocks-screen__week-strip">
            {weekDays.map((dayDate) => {
              const dayBlocks = filterBlocksByDate(activeBlocks, dayDate);
              const isSelected = dayDate === currentDate;
              const isTodayDate = dayDate === today;
              const dayName = formatLocalDate(dayDate, locale, { weekday: "short" });
              const dayNum = formatLocalDate(dayDate, locale, { day: "numeric" });

              return (
                <button
                  type="button"
                  key={dayDate}
                  className={[
                    "lifeos-time-blocks-screen__week-day-card",
                    isSelected && "lifeos-time-blocks-screen__week-day-card--selected",
                    isTodayDate && "lifeos-time-blocks-screen__week-day-card--today",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setCurrentDate(dayDate)}
                  aria-label={`${dayName} ${dayNum}. ${dayBlocks.length} blocks scheduled.`}
                >
                  <Text size="xs" weight="medium" tone={isSelected ? "default" : "muted"}>
                    {dayName}
                  </Text>
                  <Text size="lg" weight="bold">
                    {dayNum}
                  </Text>
                  <Badge tone={dayBlocks.length > 0 ? "info" : "neutral"}>
                    {dayBlocks.length} blocks
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Selected Day Timeline in Week Context */}
          <DayTimeline
            blocks={displayedBlocks}
            loading={loading}
            date={currentDate}
            timeZone={timeZone}
            now={now}
            locale={locale}
            density={timelineDensity}
            onDensityChange={setTimelineDensity}
            viewMode={timelineViewMode}
            onViewModeChange={setTimelineViewMode}
            onCreateBlock={handleOpenCreateForm}
            onEditBlock={handleOpenEditForm}
            onCompleteBlock={handleCompleteBlock}
            onDeleteBlock={handleOpenDeleteConfirm}
            onDuplicateBlock={handleDuplicateBlock}
            {...(onStartFocus ? { onStartFocusBlock: onStartFocus } : {})}
            onMoveBlock={handleMoveBlock}
            onResizeBlock={handleResizeBlock}
          />
        </div>
      )}

      {/* TimeBlockForm Dialog (Create / Edit) */}
      <TimeBlockForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={formInitialValues}
        mode={formMode}
        tasks={tasks}
        projects={projects}
        categories={categories}
        timeZone={timeZone}
        locale={locale}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete time block"
        description={`Are you sure you want to delete "${blockToDelete?.title ?? "this time block"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}

export { TimeBlockRow, type TimeBlockRowProps } from "./components/TimeBlockRow";
export {
  TimeBlockForm,
  type TimeBlockFormProps,
  type TimeBlockFormData,
  type TimeBlockTaskOption,
  type TimeBlockProjectOption,
  type TimeBlockCategoryOption,
} from "./components/TimeBlockForm";
export {
  DayTimeline,
  type DayTimelineProps,
  type DayTimelineDensity,
  type DayTimelineViewMode,
} from "./components/DayTimeline";
export {
  TimeSummaryMetrics,
  type TimeSummaryMetricsProps,
  type TimeSummaryMetricsStatus,
  type TimeSummaryCounts,
} from "./components/TimeSummaryMetrics";
export {
  TimeCategoryBreakdown,
  type TimeCategoryBreakdownProps,
  type TimeCategoryItem,
} from "./components/TimeCategoryBreakdown";
export {
  TimeGoalProgressCard,
  type TimeGoalProgressCardProps,
  type TimeGoalProgressStatus,
} from "./components/TimeGoalProgressCard";
export {
  UpcomingBlocks,
  type UpcomingBlocksProps,
  type UpcomingBlocksStatus,
} from "./components/UpcomingBlocks";
export { TimeSummary, type TimeSummaryProps } from "./components/TimeSummary";
export { TimeBlocksScreen, type TimeBlocksScreenProps } from "./components/TimeBlocksScreen";

export {
  type TimeBlock,
  type TimeBlockStatus,
  type TimeBlockCategoryInfo,
  type TimeBlockProjectContext,
  type TimeBlockTaskContext,
  timeBlockDurationMinutes,
  formatTimeBlockDuration,
  formatTimeBlockRange,
} from "./model/timeBlock";

export {
  MOCK_TIME_BLOCKS,
  MOCK_CONFLICT_TIME_BLOCKS,
  MOCK_WEEK_TIME_BLOCKS,
  MOCK_TIME_BLOCK_CATEGORIES,
  MOCK_TIME_BLOCK_PROJECTS,
  MOCK_TIME_BLOCK_TASKS,
  MOCK_TIME_SUMMARY_CATEGORIES,
} from "./model/mockTimeBlocks";

export {
  type TimeBlocksViewMode,
  type TimeBlocksDateNavigation,
  formatTimeBlocksDateLabel,
  formatTimeBlocksWeekLabel,
  getWeekDaysForDate,
  filterBlocksByDate,
  computeDayTimeBlockCounts,
} from "./model/timeBlocksScreen";

export {
  queryTimeBlocks,
  getDailyTimeSummary,
  getTimeBlock,
  createTimeBlock,
  updateTimeBlock,
  moveTimeBlock,
  resizeTimeBlock,
  changeTimeBlockStatus,
  completeTimeBlock,
  duplicateTimeBlock,
  deleteTimeBlock,
  checkTimeBlockOverlap,
  localDateTimeToInstantIso,
  instantToLocalDate,
  instantToLocalTime,
  mapTimeBlockResponse,
  type TimeBlockResponseDto,
  type TimeBlockQueryResponseDto,
  type CreateTimeBlockRequestDto,
  type UpdateTimeBlockRequestDto,
  type MoveTimeBlockRequestDto,
  type ResizeTimeBlockRequestDto,
  type ChangeTimeBlockStatusRequestDto,
  type DuplicateTimeBlockRequestDto,
  type CheckOverlapRequestDto,
  type TimeBlockOverlapResponseDto,
  type TimeBlockQueryParams,
  type DailyTimeSummaryDto,
  type FocusComparisonSource,
} from "./api/timeBlocksApi";

export {
  useTimeBlocks,
  useDailyTimeSummary,
  useTimeBlock,
  useCreateTimeBlock,
  useUpdateTimeBlock,
  useMoveTimeBlock,
  useResizeTimeBlock,
  useChangeTimeBlockStatus,
  useCompleteTimeBlock,
  useDuplicateTimeBlock,
  useDeleteTimeBlock,
  useCheckTimeBlockOverlap,
  TIME_BLOCKS_QUERY_KEY,
  TODAY_QUERY_KEY,
  CALENDAR_QUERY_KEY,
  DAILY_TIME_SUMMARY_QUERY_KEY,
} from "./hooks/useTimeBlocks";

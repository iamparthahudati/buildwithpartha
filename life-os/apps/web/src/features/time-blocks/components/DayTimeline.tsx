import React, { useState, useId } from "react";
import {
  Clock,
  Plus,
  SlidersHorizontal,
  Grid,
  List as ListIcon,
  MoreHorizontal,
  AlertTriangle,
  MoveVertical,
  Maximize2,
  Minimize2,
} from "lucide-react";

import {
  Badge,
  Button,
  Icon,
  IconButton,
  Surface,
  Text,
  VisuallyHidden,
  Skeleton,
} from "@components/ui";
import { Menu, type MenuItemDescriptor } from "@components/navigation";
import {
  localTimeToMinutes,
  localTimeFromMinutes,
  nowLocalTime,
  todayLocalDate,
  type LocalDate,
  type LocalTime,
} from "@lib/localDateTime";

import type { TimeBlock } from "../model/timeBlock";
import { TimeBlockRow } from "./TimeBlockRow";
import { formatTimeBlockDuration, formatTimeBlockRange } from "../model/timeBlock";
import "./day-timeline.css";

export type DayTimelineDensity = "compact" | "comfortable" | "spacious";
export type DayTimelineViewMode = "auto" | "grid" | "list";

export interface DayTimelineProps {
  readonly blocks?: readonly TimeBlock[];
  readonly loading?: boolean;
  readonly date?: LocalDate;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly showNowLine?: boolean;
  readonly density?: DayTimelineDensity;
  readonly onDensityChange?: (density: DayTimelineDensity) => void;
  readonly viewMode?: DayTimelineViewMode;
  readonly onViewModeChange?: (mode: DayTimelineViewMode) => void;
  readonly onCreateBlock?: (startTime: LocalTime, endTime: LocalTime) => void;
  readonly onSelectBlock?: (block: TimeBlock) => void;
  readonly onEditBlock?: (block: TimeBlock) => void;
  readonly onCompleteBlock?: (block: TimeBlock) => void;
  readonly onDeleteBlock?: (block: TimeBlock) => void;
  readonly onDuplicateBlock?: (block: TimeBlock) => void;
  readonly onStartFocusBlock?: (block: TimeBlock) => void;
  readonly onMoveBlock?: (blockId: string, newStartTime: LocalTime, newEndTime: LocalTime) => void;
  readonly onResizeBlock?: (blockId: string, newEndTime: LocalTime) => void;
  readonly startHour?: number;
  readonly endHour?: number;
  readonly locale?: string;
  readonly className?: string;
}

const DENSITY_HEIGHTS: Record<DayTimelineDensity, number> = {
  compact: 40,
  comfortable: 60,
  spacious: 90,
};

interface PositionedBlock {
  readonly block: TimeBlock;
  readonly startMins: number;
  readonly endMins: number;
  readonly durationMins: number;
  readonly topPx: number;
  readonly heightPx: number;
  readonly colIndex: number;
  readonly totalCols: number;
  readonly hasCollision: boolean;
}

function computePositionedBlocks(
  blocks: readonly TimeBlock[],
  hourHeight: number,
  startHour: number,
): PositionedBlock[] {
  if (!blocks.length) return [];

  const startOffsetMins = startHour * 60;

  const rawBlocks = blocks.map((block) => {
    const startMins = localTimeToMinutes(block.startTime);
    let endMins = localTimeToMinutes(block.endTime);
    if (endMins <= startMins) {
      endMins = 1440; // end of day fallback
    }
    const durationMins = endMins - startMins;

    const relStart = Math.max(0, startMins - startOffsetMins);
    const topPx = (relStart / 60) * hourHeight;
    const heightPx = Math.max(24, (durationMins / 60) * hourHeight);

    return {
      block,
      startMins,
      endMins,
      durationMins,
      topPx,
      heightPx,
    };
  });

  // Sort chronologically by start time, then duration descending
  rawBlocks.sort((a, b) => a.startMins - b.startMins || b.durationMins - a.durationMins);

  // Group overlapping blocks into clusters
  const clusters: (typeof rawBlocks)[] = [];
  let currentCluster: typeof rawBlocks = [];
  let maxEndMins = -1;

  for (const item of rawBlocks) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      maxEndMins = item.endMins;
    } else {
      if (item.startMins < maxEndMins) {
        currentCluster.push(item);
        if (item.endMins > maxEndMins) {
          maxEndMins = item.endMins;
        }
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        maxEndMins = item.endMins;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedBlock[] = [];

  for (const cluster of clusters) {
    const totalColsInCluster = Math.max(1, cluster.length);
    // Assign column indices to items within cluster
    const columns: number[] = []; // stores endMins for each column

    for (const item of cluster) {
      let colIndex = 0;
      while (colIndex < columns.length && (columns[colIndex] ?? 0) > item.startMins) {
        colIndex++;
      }
      columns[colIndex] = item.endMins;

      result.push({
        ...item,
        colIndex,
        totalCols: totalColsInCluster > 1 ? totalColsInCluster : 1,
        hasCollision: totalColsInCluster > 1,
      });
    }
  }

  return result;
}

export function DayTimeline({
  blocks = [],
  loading = false,
  date,
  timeZone = "UTC",
  now = new Date(),
  showNowLine = true,
  density: externalDensity,
  onDensityChange,
  viewMode: externalViewMode = "auto",
  onViewModeChange,
  onCreateBlock,
  onSelectBlock,
  onEditBlock,
  onCompleteBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onStartFocusBlock,
  onMoveBlock,
  onResizeBlock,
  startHour = 0,
  endHour = 24,
  locale = "en-US",
  className,
}: DayTimelineProps) {
  const [internalDensity, setInternalDensity] = useState<DayTimelineDensity>("comfortable");
  const [internalViewMode, setInternalViewMode] = useState<DayTimelineViewMode>("auto");

  const [dragState, setDragState] = useState<{
    blockId: string;
    type: "move" | "resize";
    startY: number;
    initialStartMins: number;
    initialEndMins: number;
    currentStartMins: number;
    currentEndMins: number;
  } | null>(null);

  const density = externalDensity ?? internalDensity;
  const viewMode = externalViewMode !== "auto" ? externalViewMode : internalViewMode;
  const hourHeight = DENSITY_HEIGHTS[density];

  const timelineId = useId();
  const today = date ?? todayLocalDate(timeZone, now);
  const isToday = today === todayLocalDate(timeZone, now);

  const handleDensityChange = (newDensity: DayTimelineDensity) => {
    if (onDensityChange) {
      onDensityChange(newDensity);
    } else {
      setInternalDensity(newDensity);
    }
  };

  const handleViewModeChange = (newMode: DayTimelineViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(newMode);
    } else {
      setInternalViewMode(newMode);
    }
  };

  // Now line calculations
  let nowTopPx: number | null = null;
  let nowTimeLabel: string | null = null;
  if (showNowLine && isToday) {
    const wallTime = nowLocalTime(timeZone, now);
    const nowMins = localTimeToMinutes(wallTime);
    const startOffsetMins = startHour * 60;
    if (nowMins >= startOffsetMins && nowMins <= endHour * 60) {
      const relMins = nowMins - startOffsetMins;
      nowTopPx = (relMins / 60) * hourHeight;
      const [h = "0", m = "0"] = wallTime.split(":");
      const dateObj = new Date(Date.UTC(2000, 0, 1, Number(h), Number(m)));
      nowTimeLabel = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(dateObj);
    }
  }

  // Pointer move/resize logic
  const handlePointerDown = (e: React.PointerEvent, block: TimeBlock, type: "move" | "resize") => {
    e.stopPropagation();
    const startMins = localTimeToMinutes(block.startTime);
    const endMins = localTimeToMinutes(block.endTime);

    setDragState({
      blockId: block.id,
      type,
      startY: e.clientY,
      initialStartMins: startMins,
      initialEndMins: endMins,
      currentStartMins: startMins,
      currentEndMins: endMins,
    });

    const target = e.target as HTMLElement;
    if (typeof target.setPointerCapture === "function") {
      target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const deltaY = e.clientY - dragState.startY;

    // Convert deltaY in px to minutes (hourHeight px = 60 mins -> 1 px = 60/hourHeight mins)
    const minsPerPx = 60 / hourHeight;
    const deltaMinsRaw = deltaY * minsPerPx;
    // Snap to 15-minute increments
    const deltaMinsSnapped = Math.round(deltaMinsRaw / 15) * 15;

    if (dragState.type === "move") {
      const duration = dragState.initialEndMins - dragState.initialStartMins;
      let newStart = Math.max(
        0,
        Math.min(1440 - duration, dragState.initialStartMins + deltaMinsSnapped),
      );
      let newEnd = newStart + duration;
      setDragState({
        ...dragState,
        currentStartMins: newStart,
        currentEndMins: newEnd,
      });
    } else if (dragState.type === "resize") {
      let newEnd = Math.max(
        dragState.initialStartMins + 15,
        Math.min(1440, dragState.initialEndMins + deltaMinsSnapped),
      );
      setDragState({
        ...dragState,
        currentEndMins: newEnd,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    const target = e.target as HTMLElement;
    if (typeof target.releasePointerCapture === "function") {
      target.releasePointerCapture(e.pointerId);
    }

    const newStart = localTimeFromMinutes(dragState.currentStartMins);
    const newEnd = localTimeFromMinutes(dragState.currentEndMins);

    if (dragState.type === "move" && onMoveBlock) {
      if (
        dragState.currentStartMins !== dragState.initialStartMins ||
        dragState.currentEndMins !== dragState.initialEndMins
      ) {
        onMoveBlock(dragState.blockId, newStart, newEnd);
      }
    } else if (dragState.type === "resize" && onResizeBlock) {
      if (dragState.currentEndMins !== dragState.initialEndMins) {
        onResizeBlock(dragState.blockId, newEnd);
      }
    }

    setDragState(null);
  };

  // Keyboard navigation / move / resize
  const handleKeyDownBlock = (e: React.KeyboardEvent, block: TimeBlock) => {
    const startMins = localTimeToMinutes(block.startTime);
    const endMins = localTimeToMinutes(block.endTime);
    const duration = endMins - startMins;

    if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const step = e.key === "ArrowUp" ? -15 : 15;
      const newStartMins = Math.max(0, Math.min(1440 - duration, startMins + step));
      const newEndMins = newStartMins + duration;
      if (onMoveBlock) {
        onMoveBlock(block.id, localTimeFromMinutes(newStartMins), localTimeFromMinutes(newEndMins));
      }
    } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const step = e.key === "ArrowUp" ? -15 : 15;
      const newEndMins = Math.max(startMins + 15, Math.min(1440, endMins + step));
      if (onResizeBlock) {
        onResizeBlock(block.id, localTimeFromMinutes(newEndMins));
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onSelectBlock) {
        onSelectBlock(block);
      }
    }
  };

  // Hours array
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(h);
  }

  const positionedBlocks = computePositionedBlocks(blocks, hourHeight, startHour);
  const rootClass = ["lifeos-day-timeline", `lifeos-day-timeline--${density}`, className]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <Surface as="div" bordered padding="md" className={rootClass}>
        <VisuallyHidden>Loading timeline grid.</VisuallyHidden>
        <div className="lifeos-day-timeline__header">
          <Skeleton shape="line" width="10rem" height="1.5rem" />
          <div className="lifeos-day-timeline__header-actions">
            <Skeleton shape="line" width="6rem" height="2rem" />
            <Skeleton shape="line" width="4rem" height="2rem" />
          </div>
        </div>
        <div className="lifeos-day-timeline__skeleton-grid">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="lifeos-day-timeline__skeleton-row">
              <Skeleton shape="line" width="3rem" height="1rem" />
              <Skeleton shape="line" width="100%" height="3rem" />
            </div>
          ))}
        </div>
      </Surface>
    );
  }

  // Render List Fallback View
  if (viewMode === "list") {
    // Sort blocks chronologically
    const sortedBlocks = [...blocks].sort(
      (a, b) => localTimeToMinutes(a.startTime) - localTimeToMinutes(b.startTime),
    );

    return (
      <Surface as="div" bordered padding="md" className={rootClass}>
        <div className="lifeos-day-timeline__header">
          <div className="lifeos-day-timeline__title-row">
            <Icon icon={Clock} decorative size="md" />
            <Text weight="semibold" size="md">
              Day Schedule List
            </Text>
            <Badge tone="neutral">{blocks.length} blocks</Badge>
          </div>

          <div className="lifeos-day-timeline__controls">
            <div
              className="lifeos-day-timeline__view-toggle"
              role="group"
              aria-label="View mode toggle"
            >
              <IconButton
                icon={Grid}
                label="Switch to visual timeline grid view"
                variant="ghost"
                size="sm"
                onClick={() => handleViewModeChange("grid")}
              />
              <IconButton
                icon={ListIcon}
                label="List view active"
                variant="secondary"
                size="sm"
                onClick={() => handleViewModeChange("list")}
              />
            </div>

            {onCreateBlock ? (
              <Button
                variant="primary"
                size="sm"
                iconStart={Plus}
                onClick={() => onCreateBlock("09:00", "10:00")}
              >
                Add block
              </Button>
            ) : null}
          </div>
        </div>

        {sortedBlocks.length === 0 ? (
          <div className="lifeos-day-timeline__empty">
            <Text tone="muted">No time blocks scheduled for this day.</Text>
            {onCreateBlock ? (
              <Button
                variant="secondary"
                size="sm"
                iconStart={Plus}
                onClick={() => onCreateBlock("09:00", "10:00")}
              >
                Create first block
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="lifeos-day-timeline__list-content">
            {sortedBlocks.map((block) => (
              <TimeBlockRow
                key={block.id}
                timeBlock={block}
                now={now}
                timeZone={timeZone}
                locale={locale}
                {...(onEditBlock ? { onEdit: () => onEditBlock(block) } : {})}
                {...(onCompleteBlock ? { onComplete: () => onCompleteBlock(block) } : {})}
                {...(onDeleteBlock ? { onDelete: () => onDeleteBlock(block) } : {})}
                {...(onDuplicateBlock ? { onDuplicate: () => onDuplicateBlock(block) } : {})}
                {...(onStartFocusBlock ? { onStartFocus: () => onStartFocusBlock(block) } : {})}
              />
            ))}
          </div>
        )}
      </Surface>
    );
  }

  // Render Visual Timeline Grid View
  return (
    <Surface as="div" bordered padding="md" className={rootClass}>
      <div className="lifeos-day-timeline__header">
        <div className="lifeos-day-timeline__title-row">
          <Icon icon={Clock} decorative size="md" />
          <Text weight="semibold" size="md">
            Day Timeline
          </Text>
          <Badge tone="neutral">{blocks.length} blocks</Badge>
        </div>

        <div className="lifeos-day-timeline__controls">
          <div
            className="lifeos-day-timeline__density-toggle"
            role="group"
            aria-label="Density selector"
          >
            <IconButton
              icon={Minimize2}
              label="Compact density"
              variant={density === "compact" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleDensityChange("compact")}
            />
            <IconButton
              icon={SlidersHorizontal}
              label="Comfortable density"
              variant={density === "comfortable" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleDensityChange("comfortable")}
            />
            <IconButton
              icon={Maximize2}
              label="Spacious density"
              variant={density === "spacious" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleDensityChange("spacious")}
            />
          </div>

          <div
            className="lifeos-day-timeline__view-toggle"
            role="group"
            aria-label="View mode selector"
          >
            <IconButton
              icon={Grid}
              label="Grid view active"
              variant="secondary"
              size="sm"
              onClick={() => handleViewModeChange("grid")}
            />
            <IconButton
              icon={ListIcon}
              label="Switch to list view"
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange("list")}
            />
          </div>

          {onCreateBlock ? (
            <Button
              variant="primary"
              size="sm"
              iconStart={Plus}
              onClick={() => onCreateBlock("09:00", "10:00")}
            >
              Add block
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className="lifeos-day-timeline__grid-container"
        id={`timeline-grid-${timelineId}`}
        role="region"
        aria-label="Timeline grid"
      >
        <div className="lifeos-day-timeline__scale">
          {hours.map((hour) => {
            const dateObj = new Date(Date.UTC(2000, 0, 1, hour, 0));
            const formattedHour = new Intl.DateTimeFormat(locale, {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "UTC",
            }).format(dateObj);

            return (
              <div
                key={hour}
                className="lifeos-day-timeline__hour-slot"
                style={{ height: `${hourHeight}px` }}
              >
                <span className="lifeos-day-timeline__hour-label">{formattedHour}</span>
              </div>
            );
          })}
        </div>

        <div className="lifeos-day-timeline__canvas">
          {/* Background Hour Lines & Clickable Gap Slots */}
          {hours.map((hour) => {
            const startTimeStr: LocalTime = `${String(hour).padStart(2, "0")}:00`;
            const endTimeStr: LocalTime = `${String(hour + 1).padStart(2, "0")}:00`;

            return (
              <div
                key={hour}
                className="lifeos-day-timeline__grid-row"
                style={{ height: `${hourHeight}px` }}
                {...(onCreateBlock
                  ? {
                      onClick: () => onCreateBlock(startTimeStr, endTimeStr),
                      role: "button",
                      tabIndex: 0,
                      "aria-label": `Slot ${startTimeStr} to ${endTimeStr}. Click or press Enter to add block.`,
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onCreateBlock(startTimeStr, endTimeStr);
                        }
                      },
                    }
                  : {})}
              >
                <div className="lifeos-day-timeline__grid-line" />
              </div>
            );
          })}

          {/* Now Line Indicator */}
          {nowTopPx !== null ? (
            <div
              className="lifeos-day-timeline__now-line"
              style={{ top: `${nowTopPx}px` }}
              aria-label={`Current time: ${nowTimeLabel}`}
            >
              <div className="lifeos-day-timeline__now-dot" />
              <div className="lifeos-day-timeline__now-bar" />
              {nowTimeLabel ? (
                <span className="lifeos-day-timeline__now-badge">{nowTimeLabel}</span>
              ) : null}
            </div>
          ) : null}

          {/* Positioned Time Blocks */}
          {positionedBlocks.map((pos) => {
            const { block, topPx, heightPx, colIndex, totalCols, hasCollision } = pos;

            const isDragging = dragState?.blockId === block.id;
            const currentStartMins = isDragging ? dragState.currentStartMins : pos.startMins;
            const currentEndMins = isDragging ? dragState.currentEndMins : pos.endMins;

            const displayStart = localTimeFromMinutes(currentStartMins);
            const displayEnd = localTimeFromMinutes(currentEndMins);

            const displayTopPx = isDragging
              ? ((currentStartMins - startHour * 60) / 60) * hourHeight
              : topPx;

            const displayHeightPx = isDragging
              ? Math.max(24, ((currentEndMins - currentStartMins) / 60) * hourHeight)
              : heightPx;

            const widthPct = 100 / totalCols;
            const leftPct = colIndex * widthPct;

            const isCompleted = block.status === "COMPLETED" || Boolean(block.completed);
            const isCancelled = block.status === "CANCELLED";
            const isConflict = hasCollision || Boolean(block.hasConflict);

            const menuItems: MenuItemDescriptor[] = [];
            if (onStartFocusBlock && !isCompleted && !isCancelled) {
              menuItems.push({
                type: "item",
                id: "focus",
                label: "Start focus",
                onSelect: () => onStartFocusBlock(block),
              });
            }
            if (onCompleteBlock && !isCompleted && !isCancelled) {
              menuItems.push({
                type: "item",
                id: "complete",
                label: "Complete",
                onSelect: () => onCompleteBlock(block),
              });
            }
            if (onEditBlock) {
              menuItems.push({
                type: "item",
                id: "edit",
                label: "Edit",
                onSelect: () => onEditBlock(block),
              });
            }
            if (onDuplicateBlock) {
              menuItems.push({
                type: "item",
                id: "duplicate",
                label: "Duplicate",
                onSelect: () => onDuplicateBlock(block),
              });
            }
            if (onDeleteBlock) {
              menuItems.push({
                type: "item",
                id: "delete",
                label: "Delete",
                onSelect: () => onDeleteBlock(block),
                destructive: true,
              });
            }

            const timeRangeText = formatTimeBlockRange(displayStart, displayEnd, locale);
            const durationText = formatTimeBlockDuration(displayStart, displayEnd, locale);

            return (
              /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
              <div
                key={block.id}
                className={[
                  "lifeos-day-timeline__block",
                  isConflict && "lifeos-day-timeline__block--conflict",
                  isCompleted && "lifeos-day-timeline__block--completed",
                  isCancelled && "lifeos-day-timeline__block--cancelled",
                  isDragging && "lifeos-day-timeline__block--dragging",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  top: `${displayTopPx}px`,
                  height: `${displayHeightPx}px`,
                  width: `calc(${widthPct}% - 4px)`,
                  left: `calc(${leftPct}% + 2px)`,
                }}
                /* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */
                tabIndex={0}
                role="group"
                aria-label={`Time block: ${block.title}, ${timeRangeText} (${durationText}). Status: ${block.status}.${isConflict ? " Conflict detected." : ""} Press Shift+Up/Down to shift position, Alt+Up/Down to resize.`}
                onKeyDown={(e) => handleKeyDownBlock(e, block)}
                onClick={() => onSelectBlock?.(block)}
              >
                {/* Move Drag Handle & Title Bar */}
                <div
                  className="lifeos-day-timeline__block-header"
                  role="button"
                  tabIndex={-1}
                  aria-label={`Move drag handle for ${block.title}`}
                  onPointerDown={(e) => handlePointerDown(e, block, "move")}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <div className="lifeos-day-timeline__block-header-left">
                    <Icon icon={MoveVertical} decorative size="sm" />
                    <Text
                      weight="medium"
                      size="xs"
                      inline
                      className="lifeos-day-timeline__block-title"
                    >
                      {block.title}
                    </Text>
                  </div>

                  <div className="lifeos-day-timeline__block-header-right">
                    {isConflict ? (
                      <Icon
                        icon={AlertTriangle}
                        size="sm"
                        label="Overlap conflict"
                        className="lifeos-day-timeline__conflict-icon"
                      />
                    ) : null}

                    {menuItems.length > 0 ? (
                      <div
                        role="presentation"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Menu
                          trigger={
                            <IconButton
                              icon={MoreHorizontal}
                              label="Block menu"
                              variant="ghost"
                              size="sm"
                            />
                          }
                          items={menuItems}
                          label="Block menu"
                          align="end"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Block Body Content */}
                <div className="lifeos-day-timeline__block-body">
                  <Text size="xs" tone="secondary">
                    {timeRangeText} ({durationText})
                  </Text>
                </div>

                {/* Bottom Resize Handle */}
                <div
                  className="lifeos-day-timeline__resize-handle"
                  role="button"
                  tabIndex={-1}
                  onPointerDown={(e) => handlePointerDown(e, block, "resize")}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title="Drag to resize block duration"
                  aria-label={`Resize handle for ${block.title}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}

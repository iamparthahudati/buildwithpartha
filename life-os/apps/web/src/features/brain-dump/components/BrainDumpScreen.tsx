import { useState } from "react";
import { Inbox, Plus } from "lucide-react";
import { PageHeader, Tabs, type TabItem } from "@components/navigation";
import { SearchField } from "@components/forms";
import { ConfirmDialog } from "@components/feedback";
import { Button, Heading, Select, Text } from "@components/ui";
import type { BrainDumpConvertTargetType, BrainDumpItem } from "../model/brainDumpItem";
import { BRAIN_DUMP_TARGET_LABELS } from "../model/brainDumpItem";
import type { BatchConvertResult } from "../hooks/useBrainDump";
import type { BrainDumpCaptureStatus } from "./BrainDumpCaptureBar";
import { BrainDumpCaptureBar } from "./BrainDumpCaptureBar";
import { BrainDumpItemRow } from "./BrainDumpItemRow";
import {
  BrainDumpConvertDialog,
  type BrainDumpConvertResult,
  type BrainDumpConvertSubmit,
} from "./BrainDumpConvertDialog";
import { BrainDumpBatchResultDialog } from "./BrainDumpBatchResultDialog";
import "./brain-dump-screen.css";

export type BrainDumpStatusFilter = "UNPROCESSED" | "DEFERRED" | "CONVERTED" | "ALL";

export interface BrainDumpConvertResultState extends BrainDumpConvertResult {
  readonly itemId: string;
}

export interface BrainDumpScreenProps {
  readonly items: readonly BrainDumpItem[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly searchQuery: string;
  readonly onSearchQueryChange: (q: string) => void;
  readonly statusFilter: BrainDumpStatusFilter;
  readonly onStatusFilterChange: (status: BrainDumpStatusFilter) => void;
  readonly showArchived: boolean;
  readonly onShowArchivedChange: (show: boolean) => void;
  readonly captureStatus: BrainDumpCaptureStatus;
  readonly isOnline: boolean;
  readonly onCapture: (content: string) => void;
  // Offline capture queue (LOS-1207)
  readonly queuedCount: number;
  readonly flushing: boolean;
  readonly onFlushQueue: () => void;
  readonly onDiscardQueued: () => void;
  readonly onDefer: (item: BrainDumpItem) => void;
  readonly onArchiveToggle: (item: BrainDumpItem) => void;
  readonly onDelete: (item: BrainDumpItem) => void;
  // Conversion workflow (LOS-1206)
  readonly onConvertSubmit: (payload: BrainDumpConvertSubmit) => void;
  readonly convertPending: boolean;
  readonly convertError: string | null;
  readonly convertResult: BrainDumpConvertResultState | null;
  readonly onConvertDismiss: () => void;
  // Batch conversion (LOS-1206)
  readonly onBatchConvert: (
    items: readonly BrainDumpItem[],
    target: BrainDumpConvertTargetType,
  ) => void;
  readonly batchPending: boolean;
  readonly batchResult: BatchConvertResult | null;
  readonly onBatchDismiss: () => void;
}

const CAPTURE_SECTION_ID = "brain-dump-capture-section";

const BATCH_TARGET_OPTIONS: readonly { value: BrainDumpConvertTargetType; label: string }[] = [
  { value: "TASK", label: "Tasks" },
  { value: "NOTE", label: "Notes" },
  { value: "PROJECT", label: "Projects" },
  { value: "GOAL", label: "Goals" },
];

function isBatchSelectable(item: BrainDumpItem): boolean {
  return item.status !== "CONVERTED" && !item.archived;
}

/**
 * Brain Dump capture and inbox screen (LOS-1205), extended with the
 * conversion workflow (LOS-1206): a per-item conversion dialog with editable
 * destination fields and a transactional result link, plus multi-select batch
 * conversion that reports partial results.
 */
export function BrainDumpScreen({
  items,
  loading,
  error,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  showArchived,
  onShowArchivedChange,
  captureStatus,
  isOnline,
  onCapture,
  queuedCount,
  flushing,
  onFlushQueue,
  onDiscardQueued,
  onDefer,
  onArchiveToggle,
  onDelete,
  onConvertSubmit,
  convertPending,
  convertError,
  convertResult,
  onConvertDismiss,
  onBatchConvert,
  batchPending,
  batchResult,
  onBatchDismiss,
}: BrainDumpScreenProps) {
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [itemToDelete, setItemToDelete] = useState<BrainDumpItem | null>(null);

  // Conversion dialog (LOS-1206).
  const [convertItem, setConvertItem] = useState<BrainDumpItem | null>(null);
  const [convertTarget, setConvertTarget] = useState<BrainDumpConvertTargetType>("TASK");

  // Batch selection (LOS-1206).
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [batchTarget, setBatchTarget] = useState<BrainDumpConvertTargetType>("TASK");

  const openConvert = (item: BrainDumpItem, target: BrainDumpConvertTargetType) => {
    setConvertTarget(target);
    setConvertItem(item);
  };

  const closeConvert = () => {
    setConvertItem(null);
    onConvertDismiss();
  };

  const toggleSelect = (item: BrainDumpItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedItems = items.filter((item) => selectedIds.has(item.id) && isBatchSelectable(item));

  const handleBatchConvert = () => {
    if (selectedItems.length === 0) return;
    onBatchConvert(selectedItems, batchTarget);
  };

  const handleBatchDismiss = () => {
    onBatchDismiss();
    clearSelection();
  };

  const resultForOpenItem =
    convertResult && convertItem && convertResult.itemId === convertItem.id ? convertResult : null;

  const renderItemList = (itemsToRender: readonly BrainDumpItem[]) => {
    if (loading) {
      return (
        <div className="lifeos-brain-dump-screen__list">
          <BrainDumpItemRow loading />
          <BrainDumpItemRow loading />
          <BrainDumpItemRow loading />
        </div>
      );
    }

    if (error) {
      return (
        <div role="alert">
          <Text tone="danger">{error}</Text>
        </div>
      );
    }

    if (itemsToRender.length === 0) {
      return (
        <div className="lifeos-brain-dump-screen__empty-state">
          <Inbox size={48} className="lifeos-brain-dump-screen__empty-icon" aria-hidden="true" />
          <Heading level={3} className="lifeos-brain-dump-screen__empty-title">
            Your inbox is clear
          </Heading>
          <Text size="sm" tone="secondary">
            Capture a thought above — decide what it becomes later.
          </Text>
          <Button
            variant="secondary"
            iconStart={Plus}
            size="sm"
            onClick={() => {
              document.getElementById(CAPTURE_SECTION_ID)?.querySelector("textarea")?.focus();
            }}
            style={{ marginBlockStart: "var(--lifeos-space-2)" }}
          >
            Capture something
          </Button>
        </div>
      );
    }

    return (
      <div className="lifeos-brain-dump-screen__list" role="list" aria-label="Brain Dump items">
        {itemsToRender.map((item) => (
          <div key={item.id} role="listitem">
            <BrainDumpItemRow
              item={item}
              selectable={isBatchSelectable(item)}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
              onDefer={onDefer}
              onArchiveToggle={onArchiveToggle}
              onDelete={setItemToDelete}
              onConvertToTask={(row) => openConvert(row, "TASK")}
              onConvertToNote={(row) => openConvert(row, "NOTE")}
              onConvertToProject={(row) => openConvert(row, "PROJECT")}
              onConvertToGoal={(row) => openConvert(row, "GOAL")}
            />
          </div>
        ))}
      </div>
    );
  };

  const tabItems: readonly TabItem[] = [
    { id: "UNPROCESSED", label: "Unprocessed", panel: renderItemList(items) },
    { id: "DEFERRED", label: "Deferred", panel: renderItemList(items) },
    { id: "CONVERTED", label: "Converted", panel: renderItemList(items) },
    { id: "ALL", label: "All", panel: renderItemList(items) },
  ];

  return (
    <>
      <div className="lifeos-brain-dump-screen">
        <PageHeader title="Brain Dump" description="Capture fast. Triage later." />

        {/* Capture section */}
        <section
          id={CAPTURE_SECTION_ID}
          className="lifeos-brain-dump-screen__capture"
          aria-labelledby="brain-dump-capture-heading"
        >
          <h2 id="brain-dump-capture-heading" className="lifeos-brain-dump-screen__section-heading">
            Capture
          </h2>
          <BrainDumpCaptureBar
            isOnline={isOnline}
            captureStatus={captureStatus}
            onCapture={onCapture}
          />

          {queuedCount > 0 && (
            <div
              className="lifeos-brain-dump-screen__queue"
              role="status"
              aria-live="polite"
              aria-label="Offline capture queue"
            >
              <Text size="sm" weight="medium">
                {queuedCount} {queuedCount === 1 ? "capture" : "captures"} waiting to sync
                {isOnline ? "…" : " — you are offline"}
              </Text>
              <div className="lifeos-brain-dump-screen__queue-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onFlushQueue}
                  loading={flushing}
                  loadingLabel="Syncing queued captures"
                  disabled={!isOnline || flushing}
                >
                  Sync now
                </Button>
                <Button variant="ghost" size="sm" onClick={onDiscardQueued} disabled={flushing}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Inbox section */}
        <section
          className="lifeos-brain-dump-screen__inbox"
          aria-labelledby="brain-dump-inbox-heading"
        >
          <div className="lifeos-brain-dump-screen__inbox-header">
            <h2 id="brain-dump-inbox-heading" className="lifeos-brain-dump-screen__section-heading">
              Inbox
            </h2>
          </div>

          <div className="lifeos-brain-dump-screen__toolbar">
            <SearchField
              label="Search Brain Dump items"
              placeholder="Search by content..."
              value={searchDraft}
              onValueChange={(val) => {
                setSearchDraft(val);
                if (val === "") onSearchQueryChange("");
              }}
              onSearch={onSearchQueryChange}
            />

            <Select
              label="Show archived"
              value={showArchived ? "yes" : "no"}
              onChange={(e) => onShowArchivedChange(e.target.value === "yes")}
              options={[
                { value: "no", label: "Active items" },
                { value: "yes", label: "Including archived" },
              ]}
            />
          </div>

          {selectedItems.length > 0 && (
            <div
              className="lifeos-brain-dump-screen__batch-bar"
              role="region"
              aria-label="Batch conversion"
            >
              <Text size="sm" weight="medium">
                {selectedItems.length} selected
              </Text>
              <div className="lifeos-brain-dump-screen__batch-controls">
                <Select
                  label="Convert selected to"
                  labelHidden
                  value={batchTarget}
                  onChange={(e) => setBatchTarget(e.target.value as BrainDumpConvertTargetType)}
                  options={BATCH_TARGET_OPTIONS}
                  disabled={batchPending}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBatchConvert}
                  disabled={batchPending}
                >
                  {batchPending
                    ? "Converting…"
                    : `Convert to ${BRAIN_DUMP_TARGET_LABELS[batchTarget]}`}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection} disabled={batchPending}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          <Tabs
            label="Brain Dump status filter"
            items={tabItems}
            selectedId={statusFilter}
            onSelectedIdChange={(id) => onStatusFilterChange(id as BrainDumpStatusFilter)}
          />
        </section>
      </div>

      {itemToDelete && (
        <ConfirmDialog
          open={itemToDelete !== null}
          title="Delete Brain Dump item"
          description={`Delete this item? "${itemToDelete.content.slice(0, 60)}${itemToDelete.content.length > 60 ? "…" : ""}" This cannot be undone.`}
          confirmLabel="Delete"
          onClose={() => setItemToDelete(null)}
          onConfirm={() => {
            onDelete(itemToDelete);
            setItemToDelete(null);
          }}
        />
      )}

      <BrainDumpConvertDialog
        key={convertItem ? `${convertItem.id}-${convertTarget}` : "none"}
        open={convertItem !== null}
        item={convertItem}
        initialTarget={convertTarget}
        pending={convertPending}
        error={convertError}
        result={resultForOpenItem}
        onSubmit={onConvertSubmit}
        onClose={closeConvert}
      />

      <BrainDumpBatchResultDialog
        open={batchResult !== null}
        result={batchResult}
        retrying={batchPending}
        onRetryFailed={(ids, target) => {
          const failed = items.filter((item) => ids.includes(item.id));
          if (failed.length > 0) onBatchConvert(failed, target);
        }}
        onClose={handleBatchDismiss}
      />
    </>
  );
}

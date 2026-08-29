import { useState } from "react";
import { Inbox, Plus } from "lucide-react";
import { PageHeader, Tabs, type TabItem } from "@components/navigation";
import { SearchField } from "@components/forms";
import { ConfirmDialog } from "@components/feedback";
import { Button, Heading, Select, Text } from "@components/ui";
import type { BrainDumpItem } from "../model/brainDumpItem";
import type { BrainDumpCaptureStatus } from "./BrainDumpCaptureBar";
import { BrainDumpCaptureBar } from "./BrainDumpCaptureBar";
import { BrainDumpItemRow } from "./BrainDumpItemRow";
import "./brain-dump-screen.css";

export type BrainDumpStatusFilter = "UNPROCESSED" | "DEFERRED" | "CONVERTED" | "ALL";

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
  readonly onDefer: (item: BrainDumpItem) => void;
  readonly onArchiveToggle: (item: BrainDumpItem) => void;
  readonly onDelete: (item: BrainDumpItem) => void;
  readonly onConvertToTask: (item: BrainDumpItem) => void;
  readonly onConvertToNote: (item: BrainDumpItem) => void;
  readonly onConvertToProject: (item: BrainDumpItem) => void;
  readonly onConvertToGoal: (item: BrainDumpItem) => void;
}

const CAPTURE_SECTION_ID = "brain-dump-capture-section";

/**
 * Brain Dump capture and inbox screen (LOS-1205).
 *
 * Split into a capture panel (top) and a triage inbox list below. Items can
 * be searched, filtered by status/archived, and triaged (convert, defer,
 * archive/restore, delete) without leaving the screen.
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
  onDefer,
  onArchiveToggle,
  onDelete,
  onConvertToTask,
  onConvertToNote,
  onConvertToProject,
  onConvertToGoal,
}: BrainDumpScreenProps) {
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [itemToDelete, setItemToDelete] = useState<BrainDumpItem | null>(null);

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
              onDefer={onDefer}
              onArchiveToggle={onArchiveToggle}
              onDelete={setItemToDelete}
              onConvertToTask={onConvertToTask}
              onConvertToNote={onConvertToNote}
              onConvertToProject={onConvertToProject}
              onConvertToGoal={onConvertToGoal}
            />
          </div>
        ))}
      </div>
    );
  };

  const tabItems: readonly TabItem[] = [
    {
      id: "UNPROCESSED",
      label: "Unprocessed",
      panel: renderItemList(items),
    },
    {
      id: "DEFERRED",
      label: "Deferred",
      panel: renderItemList(items),
    },
    {
      id: "CONVERTED",
      label: "Converted",
      panel: renderItemList(items),
    },
    {
      id: "ALL",
      label: "All",
      panel: renderItemList(items),
    },
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
    </>
  );
}

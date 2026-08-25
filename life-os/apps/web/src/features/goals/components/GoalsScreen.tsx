import { useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import {
  PageHeader,
  Tabs,
  SortControl,
  ViewToggle,
  Pagination,
  type TabItem,
  type SortOption,
} from "@components/navigation";
import { Button, TextInput, Select, Badge, Text } from "@components/ui";
import { ConfirmDialog, DetailPanel, Alert } from "@components/feedback";
import { GoalCard } from "./GoalCard";
import { GoalRow } from "./GoalRow";
import { GoalMetricSummary } from "./GoalMetricSummary";
import { GoalEmptyState } from "./GoalEmptyState";
import { GoalErrorState } from "./GoalErrorState";
import { GoalFormDialog, type GoalFormData } from "./GoalFormDialog";
import { CheckInFormDialog } from "./CheckInFormDialog";
import {
  formatGoalProgressValue,
  getGoalProgressExplanation,
  type Goal,
  type GoalSummaryCounts,
} from "../model/goal";
import "./goals-screen.css";

export interface GoalsScreenProps {
  readonly goals: readonly Goal[];
  readonly summaryCounts?: GoalSummaryCounts;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly statusTab?: string;
  readonly searchQuery?: string;
  readonly categoryFilter?: string;
  readonly progressTypeFilter?: string;
  readonly sortState?: { readonly optionId: string; readonly direction: "asc" | "desc" };
  readonly viewMode?: "grid" | "list" | "table";
  readonly currentPage?: number;
  readonly totalPages?: number;
  readonly totalItems?: number;
  readonly selectedGoal?: Goal | null;
  readonly onStatusTabChange?: (tab: string) => void;
  readonly onSearchQueryChange?: (q: string) => void;
  readonly onCategoryFilterChange?: (category: string) => void;
  readonly onProgressTypeFilterChange?: (type: string) => void;
  readonly onSortChange?: (sort: { optionId: string; direction: "asc" | "desc" }) => void;
  readonly onViewModeChange?: (mode: "grid" | "list" | "table") => void;
  readonly onPageChange?: (page: number) => void;
  readonly onSelectGoal?: (goal: Goal | null) => void;
  readonly onNavigateToGoalDetail?: (goalId: string) => void;
  readonly onRetry?: () => void;
  readonly onCreateGoal?: (data: GoalFormData) => Promise<void> | void;
  readonly onUpdateGoal?: (id: string, data: GoalFormData) => Promise<void> | void;
  readonly onPauseGoal?: (id: string) => Promise<void> | void;
  readonly onResumeGoal?: (id: string) => Promise<void> | void;
  readonly onCompleteGoal?: (id: string) => Promise<void> | void;
  readonly onArchiveGoal?: (id: string) => Promise<void> | void;
  readonly onRestoreGoal?: (id: string) => Promise<void> | void;
  readonly onDeleteGoal?: (id: string) => Promise<void> | void;
  readonly onCheckInGoal?: (goalId: string, value: number, note?: string) => Promise<void> | void;
  readonly conflictError?: string | null;
  readonly onResolveConflict?: () => void;
}

const STATUS_TABS: readonly TabItem[] = [
  { id: "ALL", label: "All Goals", panel: null },
  { id: "IN_PROGRESS", label: "In Progress", panel: null },
  { id: "NOT_STARTED", label: "Not Started", panel: null },
  { id: "PAUSED", label: "Paused", panel: null },
  { id: "COMPLETED", label: "Completed", panel: null },
  { id: "ARCHIVED", label: "Archived", panel: null },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: "PERSONAL", label: "Personal" },
  { value: "WORK", label: "Work" },
  { value: "HEALTH", label: "Health & Fitness" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "LEARNING", label: "Learning" },
  { value: "CAREER", label: "Career" },
];

const PROGRESS_TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "NUMERIC", label: "Numeric Target" },
  { value: "MILESTONE", label: "Milestone Target" },
  { value: "BINARY", label: "Binary Target" },
];

const SORT_OPTIONS: readonly SortOption[] = [
  { id: "title", label: "Title" },
  { id: "category", label: "Category" },
  { id: "status", label: "Status" },
  { id: "targetDate", label: "Target Date" },
  { id: "updatedAt", label: "Updated Date" },
];

export function GoalsScreen({
  goals,
  summaryCounts,
  loading = false,
  error = null,
  statusTab = "ALL",
  searchQuery = "",
  categoryFilter = "ALL",
  progressTypeFilter = "ALL",
  sortState = { optionId: "updatedAt", direction: "desc" },
  viewMode = "grid",
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  selectedGoal = null,
  onStatusTabChange,
  onSearchQueryChange,
  onCategoryFilterChange,
  onProgressTypeFilterChange,
  onSortChange,
  onViewModeChange,
  onPageChange,
  onSelectGoal,
  onNavigateToGoalDetail,
  onRetry,
  onCreateGoal,
  onUpdateGoal,
  onPauseGoal,
  onResumeGoal,
  onCompleteGoal,
  onArchiveGoal,
  onRestoreGoal,
  onDeleteGoal,
  onCheckInGoal,
  conflictError,
  onResolveConflict,
}: GoalsScreenProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [checkInGoalTarget, setCheckInGoalTarget] = useState<Goal | null>(null);
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<Goal | null>(null);
  const [confirmArchiveGoal, setConfirmArchiveGoal] = useState<Goal | null>(null);

  const handleCreateSubmit = async (formData: GoalFormData) => {
    if (onCreateGoal) {
      await onCreateGoal(formData);
    }
    setCreateDialogOpen(false);
  };

  const handleEditSubmit = async (formData: GoalFormData) => {
    if (editingGoal && onUpdateGoal) {
      await onUpdateGoal(editingGoal.id, formData);
    }
    setEditingGoal(null);
  };

  const handleCheckInSubmit = async (val: number, note?: string) => {
    if (checkInGoalTarget && onCheckInGoal) {
      await onCheckInGoal(checkInGoalTarget.id, val, note);
    }
    setCheckInGoalTarget(null);
  };

  return (
    <div className="lifeos-goals-screen">
      <PageHeader
        title="Goals"
        description="Track progress towards your objective targets and milestones"
        primaryAction={
          <Button variant="primary" onClick={() => setCreateDialogOpen(true)}>
            <Plus size={16} /> New Goal
          </Button>
        }
      />

      <GoalMetricSummary {...(summaryCounts ? { counts: summaryCounts } : {})} loading={loading} />

      {conflictError ? (
        <Alert tone="danger" heading="Version Conflict">
          <p>{conflictError}</p>
          {onResolveConflict ? (
            <Button type="button" variant="secondary" onClick={onResolveConflict}>
              Reload latest goals
            </Button>
          ) : null}
        </Alert>
      ) : null}

      <div className="lifeos-goals-screen__toolbar">
        <Tabs
          items={STATUS_TABS}
          selectedId={statusTab}
          onSelectedIdChange={(tabId) => onStatusTabChange?.(tabId)}
          label="Goal status filter"
        />

        <div className="lifeos-goals-screen__controls">
          <div className="lifeos-goals-screen__filters">
            <div className="lifeos-goals-screen__search">
              <TextInput
                label="Search goals"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange?.(e.target.value)}
              />
            </div>

            <div className="lifeos-goals-screen__select">
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => onCategoryFilterChange?.(e.target.value)}
                options={CATEGORY_FILTER_OPTIONS}
              />
            </div>

            <div className="lifeos-goals-screen__select">
              <Select
                label="Progress type"
                value={progressTypeFilter}
                onChange={(e) => onProgressTypeFilterChange?.(e.target.value)}
                options={PROGRESS_TYPE_FILTER_OPTIONS}
              />
            </div>
          </div>

          <div className="lifeos-goals-screen__view-options">
            <SortControl
              options={SORT_OPTIONS}
              value={{ optionId: sortState.optionId, direction: sortState.direction }}
              onChange={(sort) => onSortChange?.(sort)}
            />

            <ViewToggle
              value={viewMode}
              onChange={(mode) => onViewModeChange?.(mode)}
              modes={["grid", "list", "table"]}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="lifeos-goals-screen__grid">
          <GoalCard loading />
          <GoalCard loading />
          <GoalCard loading />
        </div>
      ) : error ? (
        <GoalErrorState message={error} onRetry={onRetry ?? (() => {})} />
      ) : goals.length === 0 ? (
        <GoalEmptyState onCreateGoal={() => setCreateDialogOpen(true)} />
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="lifeos-goals-screen__grid">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onCheckIn={(g) => setCheckInGoalTarget(g)}
                  onPause={(g) => onPauseGoal?.(g.id)}
                  onResume={(g) => onResumeGoal?.(g.id)}
                  onComplete={(g) => onCompleteGoal?.(g.id)}
                  onEdit={(g) => setEditingGoal(g)}
                  onArchive={(g) => setConfirmArchiveGoal(g)}
                  onClick={(g) => onSelectGoal?.(g)}
                />
              ))}
            </div>
          ) : (
            <div className="lifeos-goals-screen__list">
              {goals.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  onCheckIn={(g) => setCheckInGoalTarget(g)}
                  onPause={(g) => onPauseGoal?.(g.id)}
                  onResume={(g) => onResumeGoal?.(g.id)}
                  onComplete={(g) => onCompleteGoal?.(g.id)}
                  onEdit={(g) => setEditingGoal(g)}
                  onArchive={(g) => setConfirmArchiveGoal(g)}
                  onClick={(g) => onSelectGoal?.(g)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <Pagination
              page={currentPage}
              pageSize={10}
              total={totalItems}
              onPageChange={(p) => onPageChange?.(p)}
              label="Goals pagination"
            />
          ) : null}
        </>
      )}

      {selectedGoal ? (
        <DetailPanel
          open={Boolean(selectedGoal)}
          onClose={() => onSelectGoal?.(null)}
          title={selectedGoal.title}
          content={
            <div className="lifeos-goals-screen__detail-content">
              <div className="lifeos-goals-screen__detail-section">
                <Text tone="muted" size="sm">
                  Status
                </Text>
                <Badge>{selectedGoal.status}</Badge>
              </div>

              {selectedGoal.description ? (
                <div className="lifeos-goals-screen__detail-section">
                  <Text tone="muted" size="sm">
                    Description
                  </Text>
                  <Text>{selectedGoal.description}</Text>
                </div>
              ) : null}

              <div className="lifeos-goals-screen__detail-section">
                <Text tone="muted" size="sm">
                  Current Progress
                </Text>
                <Text weight="bold" size="lg">
                  {formatGoalProgressValue(selectedGoal)} ({selectedGoal.progressPercentage}%)
                </Text>
                <Text size="sm" tone="muted">
                  {getGoalProgressExplanation(selectedGoal)}
                </Text>
              </div>

              <div className="lifeos-goals-screen__detail-meta">
                <div>
                  <strong>Check-in Cadence:</strong> {selectedGoal.checkInCadence}
                </div>
                <div>
                  <strong>Target Date:</strong> {selectedGoal.targetDate ?? "None"}
                </div>
              </div>

              <div className="lifeos-goals-screen__view-options">
                {onNavigateToGoalDetail ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigateToGoalDetail(selectedGoal.id)}
                  >
                    <ExternalLink size={14} /> Full details
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setCheckInGoalTarget(selectedGoal)}
                >
                  Check In
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingGoal(selectedGoal)}>
                  Edit
                </Button>
                {selectedGoal.status === "PAUSED" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onResumeGoal?.(selectedGoal.id)}
                  >
                    Resume
                  </Button>
                ) : selectedGoal.status !== "COMPLETED" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onPauseGoal?.(selectedGoal.id)}
                  >
                    Pause
                  </Button>
                ) : null}
                {selectedGoal.status !== "COMPLETED" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onCompleteGoal?.(selectedGoal.id)}
                  >
                    Complete
                  </Button>
                ) : null}
                {selectedGoal.archived ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRestoreGoal?.(selectedGoal.id)}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirmArchiveGoal(selectedGoal)}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </div>
          }
        />
      ) : null}

      <GoalFormDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateSubmit}
        mode="create"
      />

      {editingGoal ? (
        <GoalFormDialog
          open={Boolean(editingGoal)}
          onClose={() => setEditingGoal(null)}
          onSubmit={handleEditSubmit}
          mode="edit"
          initialValues={{
            title: editingGoal.title,
            description: editingGoal.description ?? null,
            category: editingGoal.category,
            progressType: editingGoal.progressType,
            targetValue: editingGoal.targetValue ?? null,
            currentValue: editingGoal.currentValue,
            unit: editingGoal.unit ?? null,
            targetDate: editingGoal.targetDate ?? null,
            status: editingGoal.status,
            checkInCadence: editingGoal.checkInCadence,
          }}
        />
      ) : null}

      {checkInGoalTarget ? (
        <CheckInFormDialog
          open={Boolean(checkInGoalTarget)}
          goal={checkInGoalTarget}
          onClose={() => setCheckInGoalTarget(null)}
          onSubmit={handleCheckInSubmit}
        />
      ) : null}

      {confirmArchiveGoal ? (
        <ConfirmDialog
          open={Boolean(confirmArchiveGoal)}
          onClose={() => setConfirmArchiveGoal(null)}
          title="Archive Goal"
          description={`Are you sure you want to archive "${confirmArchiveGoal.title}"?`}
          confirmLabel="Archive Goal"
          onConfirm={() => {
            if (confirmArchiveGoal) {
              void onArchiveGoal?.(confirmArchiveGoal.id);
            }
            setConfirmArchiveGoal(null);
          }}
        />
      ) : null}

      {confirmDeleteGoal ? (
        <ConfirmDialog
          open={Boolean(confirmDeleteGoal)}
          onClose={() => setConfirmDeleteGoal(null)}
          title="Delete Goal"
          description={`Are you sure you want to permanently delete "${confirmDeleteGoal.title}"? This action cannot be undone.`}
          confirmLabel="Delete Goal"
          onConfirm={() => {
            if (confirmDeleteGoal) {
              void onDeleteGoal?.(confirmDeleteGoal.id);
            }
            setConfirmDeleteGoal(null);
          }}
        />
      ) : null}
    </div>
  );
}

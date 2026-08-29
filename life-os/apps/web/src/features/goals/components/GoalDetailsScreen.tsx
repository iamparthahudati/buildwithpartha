import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Pause,
  Play,
  Trash2,
  Archive,
  Edit3,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import { Button, Badge, Text, ProgressBar, Skeleton } from "@components/ui";
import { Alert, ConfirmDialog, EmptyState, ErrorState } from "@components/feedback";
import { ProgressEditor } from "./ProgressEditor";
import { CheckInHistory } from "./CheckInHistory";
import { GoalLinkedWorkList } from "./GoalLinkedWorkList";
import { CheckInFormDialog } from "./CheckInFormDialog";
import { GoalFormDialog, type GoalFormData } from "./GoalFormDialog";
import { GoalLinkModal } from "./GoalLinkModal";
import {
  formatGoalProgressValue,
  getGoalProgressExplanation,
  type Goal,
  type GoalCheckIn,
  type GoalLink,
  type GoalLinkTargetType,
} from "../model/goal";
import "./goal-details-screen.css";

export interface GoalDetailsScreenProps {
  readonly goal?: Goal | null;
  readonly checkIns?: readonly GoalCheckIn[];
  readonly links?: readonly GoalLink[];
  readonly loading?: boolean;
  readonly notFound?: boolean;
  readonly forbidden?: boolean;
  readonly error?: Error | null;
  readonly onRetry?: () => void;
  readonly onGoBack?: () => void;
  readonly onCheckIn?: (value: number, note?: string) => Promise<void> | void;
  readonly onDeleteCheckIn?: (checkInId: string) => Promise<void> | void;
  readonly onAddLink?: (targetType: GoalLinkTargetType, targetId: string) => Promise<void> | void;
  readonly onDeleteLink?: (linkId: string) => Promise<void> | void;
  readonly onPauseGoal?: (id: string) => Promise<void> | void;
  readonly onResumeGoal?: (id: string) => Promise<void> | void;
  readonly onCompleteGoal?: (id: string) => Promise<void> | void;
  readonly onArchiveGoal?: (id: string) => Promise<void> | void;
  readonly onRestoreGoal?: (id: string) => Promise<void> | void;
  readonly onDeleteGoal?: (id: string) => Promise<void> | void;
  readonly onUpdateGoal?: (id: string, data: GoalFormData) => Promise<void> | void;
  readonly conflictError?: string | null;
  readonly onResolveConflict?: () => void;
}

export function GoalDetailsScreen({
  goal,
  checkIns = [],
  links = [],
  loading = false,
  notFound = false,
  forbidden = false,
  error = null,
  onRetry,
  onGoBack,
  onCheckIn,
  onAddLink,
  onDeleteLink,
  onPauseGoal,
  onResumeGoal,
  onCompleteGoal,
  onArchiveGoal,
  onRestoreGoal,
  onDeleteGoal,
  onUpdateGoal,
  conflictError,
  onResolveConflict,
}: GoalDetailsScreenProps) {
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  if (loading) {
    return (
      <div className="lifeos-goal-details-screen">
        <Skeleton height="40px" width="200px" />
        <Skeleton height="120px" width="100%" />
        <Skeleton height="200px" width="100%" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="lifeos-goal-details-screen">
        <EmptyState
          variant="first-use"
          title="Goal not found"
          description="The goal you are looking for does not exist or has been deleted."
          {...(onGoBack
            ? {
                primaryAction: (
                  <Button variant="primary" onClick={onGoBack}>
                    Back to Goals
                  </Button>
                ),
              }
            : {})}
        />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="lifeos-goal-details-screen">
        <ErrorState
          scope="page"
          title="Access denied"
          description="You do not have permission to view this goal."
          {...(onGoBack ? { onRetry: onGoBack } : {})}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="lifeos-goal-details-screen">
        <ErrorState
          scope="page"
          title="Failed to load goal"
          description={error.message}
          {...(onRetry ? { onRetry } : {})}
        />
      </div>
    );
  }

  if (!goal) {
    return null;
  }

  const handleEditSubmit = async (formData: GoalFormData) => {
    if (onUpdateGoal) {
      await onUpdateGoal(goal.id, formData);
    }
    setEditDialogOpen(false);
  };

  const handleCheckInSubmit = async (val: number, note?: string) => {
    if (onCheckIn) {
      await onCheckIn(val, note);
    }
    setCheckInDialogOpen(false);
  };

  const handleLinkSubmit = async (targetType: GoalLinkTargetType, targetId: string) => {
    if (onAddLink) {
      await onAddLink(targetType, targetId);
    }
    setLinkModalOpen(false);
  };

  return (
    <div className="lifeos-goal-details-screen">
      <div className="lifeos-goal-details-screen__header">
        {onGoBack ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoBack}
            className="lifeos-goal-details-screen__back-btn"
          >
            <ArrowLeft size={16} /> Back to Goals
          </Button>
        ) : null}

        <div className="lifeos-goal-details-screen__title-row">
          <div className="lifeos-goal-details-screen__title-group">
            <Text size="lg" weight="bold">
              {goal.title}
            </Text>
            <Badge>{goal.category}</Badge>
            <Badge>{goal.status}</Badge>
          </div>

          <div className="lifeos-goal-details-screen__actions">
            <Button variant="primary" size="sm" onClick={() => setCheckInDialogOpen(true)}>
              <Plus size={16} /> Check In
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit3 size={16} /> Edit
            </Button>
            {goal.status === "PAUSED" ? (
              <Button variant="secondary" size="sm" onClick={() => onResumeGoal?.(goal.id)}>
                <Play size={16} /> Resume
              </Button>
            ) : goal.status !== "COMPLETED" ? (
              <Button variant="secondary" size="sm" onClick={() => onPauseGoal?.(goal.id)}>
                <Pause size={16} /> Pause
              </Button>
            ) : null}
            {goal.status !== "COMPLETED" ? (
              <Button variant="secondary" size="sm" onClick={() => onCompleteGoal?.(goal.id)}>
                <CheckCircle2 size={16} /> Complete
              </Button>
            ) : null}
            {goal.archived ? (
              <Button variant="secondary" size="sm" onClick={() => onRestoreGoal?.(goal.id)}>
                <Archive size={16} /> Restore
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setConfirmArchive(true)}>
                <Archive size={16} /> Archive
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>
      </div>

      {conflictError ? (
        <Alert tone="danger" heading="Version Conflict">
          <p>{conflictError}</p>
          {onResolveConflict ? (
            <Button type="button" variant="secondary" onClick={onResolveConflict}>
              Reload latest goal details
            </Button>
          ) : null}
        </Alert>
      ) : null}

      <div className="lifeos-goal-details-screen__grid">
        <div className="lifeos-goal-details-screen__main">
          <div className="lifeos-goal-details-screen__section">
            <Text tone="muted" size="sm" weight="medium">
              OVERVIEW & PROGRESS
            </Text>
            {goal.description ? <Text>{goal.description}</Text> : null}

            <div>
              <Text weight="bold" size="lg">
                {formatGoalProgressValue(goal)} ({goal.progressPercentage}%)
              </Text>
              <ProgressBar value={goal.progressPercentage} max={100} label="Goal progress" />
            </div>

            <Text size="sm" tone="muted">
              {getGoalProgressExplanation(goal, links.length)}
            </Text>

            <div className="lifeos-goal-details-screen__meta-grid">
              <div>
                <Text size="xs" tone="muted">
                  PROGRESS TYPE
                </Text>
                <Text weight="medium">{goal.progressType}</Text>
              </div>
              <div>
                <Text size="xs" tone="muted">
                  CHECK-IN CADENCE
                </Text>
                <Text weight="medium">{goal.checkInCadence}</Text>
              </div>
              <div>
                <Text size="xs" tone="muted">
                  TARGET DATE
                </Text>
                <Text weight="medium">{goal.targetDate ?? "None set"}</Text>
              </div>
              <div>
                <Text size="xs" tone="muted">
                  VERSION
                </Text>
                <Text weight="medium">v{goal.version ?? 1}</Text>
              </div>
            </div>
          </div>

          <div className="lifeos-goal-details-screen__section">
            <ProgressEditor
              goal={goal}
              onSaveProgress={(newVal, note) => onCheckIn?.(newVal, note)}
            />
          </div>

          <div className="lifeos-goal-details-screen__section">
            <CheckInHistory
              checkIns={checkIns}
              {...(goal.unit ? { unit: goal.unit } : {})}
              onAddCheckIn={() => setCheckInDialogOpen(true)}
            />
          </div>
        </div>

        <div className="lifeos-goal-details-screen__sidebar">
          <div className="lifeos-goal-details-screen__section">
            <div className="lifeos-goal-details-screen__title-row">
              <Text tone="muted" size="sm" weight="medium">
                LINKED WORK ITEMS ({links.length})
              </Text>
              <Button variant="ghost" size="sm" onClick={() => setLinkModalOpen(true)}>
                <LinkIcon size={14} /> Add Link
              </Button>
            </div>
            <GoalLinkedWorkList
              links={links}
              onAddLink={() => setLinkModalOpen(true)}
              onRemoveLink={(linkId) => onDeleteLink?.(linkId)}
            />
          </div>
        </div>
      </div>

      {checkInDialogOpen ? (
        <CheckInFormDialog
          open={checkInDialogOpen}
          goal={goal}
          onClose={() => setCheckInDialogOpen(false)}
          onSubmit={handleCheckInSubmit}
        />
      ) : null}

      {editDialogOpen ? (
        <GoalFormDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSubmit={handleEditSubmit}
          mode="edit"
          initialValues={{
            title: goal.title,
            description: goal.description ?? null,
            category: goal.category,
            progressType: goal.progressType,
            targetValue: goal.targetValue ?? null,
            currentValue: goal.currentValue,
            unit: goal.unit ?? null,
            targetDate: goal.targetDate ?? null,
            status: goal.status,
            checkInCadence: goal.checkInCadence,
          }}
        />
      ) : null}

      {linkModalOpen ? (
        <GoalLinkModal
          open={linkModalOpen}
          onClose={() => setLinkModalOpen(false)}
          onSubmit={handleLinkSubmit}
        />
      ) : null}

      {confirmArchive ? (
        <ConfirmDialog
          open={confirmArchive}
          onClose={() => setConfirmArchive(false)}
          title="Archive Goal"
          description={`Are you sure you want to archive "${goal.title}"?`}
          confirmLabel="Archive Goal"
          onConfirm={() => {
            void onArchiveGoal?.(goal.id);
            setConfirmArchive(false);
          }}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete Goal"
          description={`Are you sure you want to permanently delete "${goal.title}"? This action cannot be undone.`}
          confirmLabel="Delete Goal"
          onConfirm={() => {
            void onDeleteGoal?.(goal.id);
            setConfirmDelete(false);
          }}
        />
      ) : null}
    </div>
  );
}

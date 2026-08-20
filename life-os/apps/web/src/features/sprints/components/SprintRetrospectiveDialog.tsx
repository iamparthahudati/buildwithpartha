import { useState } from "react";
import { Text, Textarea, Select } from "@components/ui";
import { FormField } from "@components/forms";
import { FormDialog } from "@components/feedback";
import type { Sprint } from "../model/sprint";
import "./sprint-retrospective-dialog.css";

export interface SprintRetrospectiveData {
  readonly sprintId: string;
  readonly retrospectiveNotes?: string;
  readonly whatWentWell?: string;
  readonly whatCouldBeImproved?: string;
  readonly actionItems?: readonly string[];
  readonly carryOverDestination?: "NEXT_SPRINT" | "BACKLOG";
}

export interface SprintRetrospectiveDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: SprintRetrospectiveData) => Promise<void> | void;
  readonly sprint?: Sprint;
  readonly isPending?: boolean;
  readonly error?: string;
}

const CARRY_OVER_OPTIONS = [
  { value: "NEXT_SPRINT", label: "Carry over open tasks to next sprint" },
  { value: "BACKLOG", label: "Return open tasks to backlog" },
];

export function SprintRetrospectiveDialog({
  open,
  onClose,
  onSubmit,
  sprint,
  isPending = false,
  error,
}: SprintRetrospectiveDialogProps) {
  const [whatWentWell, setWhatWentWell] = useState(sprint?.whatWentWell ?? "");
  const [whatCouldBeImproved, setWhatCouldBeImproved] = useState(sprint?.whatCouldBeImproved ?? "");
  const [actionItemsText, setActionItemsText] = useState((sprint?.actionItems ?? []).join("\n"));
  const [retrospectiveNotes, setRetrospectiveNotes] = useState(sprint?.retrospectiveNotes ?? "");
  const [carryOverDestination, setCarryOverDestination] = useState<"NEXT_SPRINT" | "BACKLOG">(
    "NEXT_SPRINT",
  );

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevSprint, setPrevSprint] = useState(sprint);

  if (open !== prevOpen || sprint !== prevSprint) {
    setPrevOpen(open);
    setPrevSprint(sprint);
    if (open && sprint) {
      setWhatWentWell(sprint.whatWentWell ?? "");
      setWhatCouldBeImproved(sprint.whatCouldBeImproved ?? "");
      setActionItemsText((sprint.actionItems ?? []).join("\n"));
      setRetrospectiveNotes(sprint.retrospectiveNotes ?? "");
      setCarryOverDestination("NEXT_SPRINT");
    }
  }

  function handleSubmit() {
    if (!sprint) return;

    const actionItems = actionItemsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    onSubmit({
      sprintId: sprint.id,
      whatWentWell: whatWentWell.trim() || undefined,
      whatCouldBeImproved: whatCouldBeImproved.trim() || undefined,
      actionItems: actionItems.length > 0 ? actionItems : undefined,
      retrospectiveNotes: retrospectiveNotes.trim() || undefined,
      carryOverDestination,
    });
  }

  const isReadOnly = sprint?.status === "COMPLETED";
  const completedPts = sprint?.completedStoryPoints ?? 0;
  const totalPts = sprint?.totalStoryPoints ?? 0;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        isReadOnly
          ? `Retrospective — ${sprint?.name ?? "Sprint"}`
          : `Complete Sprint — ${sprint?.name ?? ""}`
      }
      submitLabel={isReadOnly ? "Save Notes" : "Complete Sprint"}
      pending={isPending}
      error={error}
    >
      <div className="sprint-retrospective-dialog__content">
        <div className="sprint-retrospective-dialog__summary">
          <Text size="sm" weight="semibold">
            Final Performance
          </Text>
          <Text size="sm" tone="muted">
            {completedPts} of {totalPts} story points completed (
            {totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0}%)
          </Text>
        </div>

        <FormField name="whatWentWell" label="What went well?" required={false}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              placeholder="Key achievements, smooth processes, or wins..."
              rows={2}
            />
          )}
        </FormField>

        <FormField name="whatCouldBeImproved" label="What could be improved?" required={false}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={whatCouldBeImproved}
              onChange={(e) => setWhatCouldBeImproved(e.target.value)}
              placeholder="Bottlenecks, estimate drift, or challenges..."
              rows={2}
            />
          )}
        </FormField>

        <FormField name="actionItems" label="Action Items (one per line)" required={false}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={actionItemsText}
              onChange={(e) => setActionItemsText(e.target.value)}
              placeholder="Action items for the upcoming sprint..."
              rows={2}
            />
          )}
        </FormField>

        <FormField name="retrospectiveNotes" label="Summary Notes" required={false}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={retrospectiveNotes}
              onChange={(e) => setRetrospectiveNotes(e.target.value)}
              placeholder="Overall retrospective summary..."
              rows={2}
            />
          )}
        </FormField>

        {!isReadOnly ? (
          <FormField name="carryOver" label="Uncompleted Tasks Action">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                options={CARRY_OVER_OPTIONS}
                value={carryOverDestination}
                onChange={(e) =>
                  setCarryOverDestination(e.target.value as "NEXT_SPRINT" | "BACKLOG")
                }
              />
            )}
          </FormField>
        ) : null}
      </div>
    </FormDialog>
  );
}

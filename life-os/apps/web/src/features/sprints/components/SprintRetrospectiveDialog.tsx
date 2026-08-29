import { useState } from "react";
import { Button, Text, Textarea, Select } from "@components/ui";
import { FormField } from "@components/forms";
import { Dialog, FormDialog } from "@components/feedback";
import type { Sprint } from "../model/sprint";
import "./sprint-retrospective-dialog.css";

export interface SprintRetrospectiveData {
  readonly sprintId: string;
  readonly retrospectiveNotes?: string;
  readonly whatWentWell?: string;
  readonly whatCouldBeImproved?: string;
  readonly actionItems?: readonly string[];
  readonly carryOverDestination?: "NEXT_SPRINT" | "BACKLOG";
  readonly targetSprintId?: string;
}

export interface SprintCarryOverTarget {
  readonly id: string;
  readonly name: string;
}

export interface SprintRetrospectiveDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: SprintRetrospectiveData) => Promise<void> | void;
  readonly sprint?: Sprint;
  readonly isPending?: boolean;
  readonly error?: string;
  readonly carryOverTargets?: readonly SprintCarryOverTarget[];
}

export function SprintRetrospectiveDialog({
  open,
  onClose,
  onSubmit,
  sprint,
  isPending = false,
  error,
  carryOverTargets = [],
}: SprintRetrospectiveDialogProps) {
  const [whatWentWell, setWhatWentWell] = useState(sprint?.whatWentWell ?? "");
  const [whatCouldBeImproved, setWhatCouldBeImproved] = useState(sprint?.whatCouldBeImproved ?? "");
  const [actionItemsText, setActionItemsText] = useState((sprint?.actionItems ?? []).join("\n"));
  const [retrospectiveNotes, setRetrospectiveNotes] = useState(sprint?.retrospectiveNotes ?? "");
  const [carryOverDestination, setCarryOverDestination] = useState<"NEXT_SPRINT" | "BACKLOG">(
    carryOverTargets.length > 0 ? "NEXT_SPRINT" : "BACKLOG",
  );
  const [targetSprintId, setTargetSprintId] = useState(carryOverTargets[0]?.id ?? "");
  const [targetError, setTargetError] = useState<string | undefined>();

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
      setCarryOverDestination(carryOverTargets.length > 0 ? "NEXT_SPRINT" : "BACKLOG");
      setTargetSprintId(carryOverTargets[0]?.id ?? "");
      setTargetError(undefined);
    }
  }

  function handleSubmit() {
    if (!sprint) return;
    if (carryOverDestination === "NEXT_SPRINT" && !targetSprintId) {
      setTargetError("Choose the planned Sprint that should receive open tasks.");
      return;
    }

    const actionItems = actionItemsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload: SprintRetrospectiveData = {
      sprintId: sprint.id,
      carryOverDestination,
      ...(carryOverDestination === "NEXT_SPRINT" ? { targetSprintId } : {}),
      ...(whatWentWell.trim() ? { whatWentWell: whatWentWell.trim() } : {}),
      ...(whatCouldBeImproved.trim() ? { whatCouldBeImproved: whatCouldBeImproved.trim() } : {}),
      ...(actionItems.length > 0 ? { actionItems } : {}),
      ...(retrospectiveNotes.trim() ? { retrospectiveNotes: retrospectiveNotes.trim() } : {}),
    };

    onSubmit(payload);
  }

  const isReadOnly = sprint?.status === "COMPLETED";
  const completedPts = sprint?.completedStoryPoints ?? 0;
  const totalPts = sprint?.totalStoryPoints ?? 0;

  if (isReadOnly) {
    return (
      <Dialog open={open} onClose={onClose} title={`Retrospective — ${sprint?.name ?? "Sprint"}`}>
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
          <RetrospectiveSection label="What went well?" value={sprint?.whatWentWell} />
          <RetrospectiveSection
            label="What could be improved?"
            value={sprint?.whatCouldBeImproved}
          />
          <RetrospectiveSection label="Action items" value={sprint?.actionItems?.join("\n")} />
          <RetrospectiveSection label="Summary notes" value={sprint?.retrospectiveNotes} />
          <div className="sprint-retrospective-dialog__actions">
            <Button onClick={onClose}>Close retrospective</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Complete Sprint — ${sprint?.name ?? ""}`}
      submitLabel="Complete Sprint"
      pending={isPending}
      {...(error ? { error } : {})}
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
                options={[
                  ...(carryOverTargets.length > 0
                    ? [
                        {
                          value: "NEXT_SPRINT",
                          label: "Carry over open Tasks to a planned Sprint",
                        },
                      ]
                    : []),
                  { value: "BACKLOG", label: "Return open Tasks to backlog" },
                ]}
                value={carryOverDestination}
                onChange={(e) =>
                  setCarryOverDestination(e.target.value as "NEXT_SPRINT" | "BACKLOG")
                }
              />
            )}
          </FormField>
        ) : null}

        {carryOverDestination === "NEXT_SPRINT" ? (
          <FormField
            name="targetSprintId"
            label="Carry Over to Sprint"
            {...(targetError ? { error: targetError } : {})}
          >
            {(fieldProps) => (
              <Select
                {...fieldProps}
                options={carryOverTargets.map((target) => ({
                  value: target.id,
                  label: target.name,
                }))}
                value={targetSprintId}
                onChange={(event) => {
                  setTargetSprintId(event.target.value);
                  setTargetError(undefined);
                }}
                placeholder="Choose a planned Sprint"
              />
            )}
          </FormField>
        ) : null}
      </div>
    </FormDialog>
  );
}

function RetrospectiveSection({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | undefined;
}) {
  return (
    <section className="sprint-retrospective-dialog__read-only-section">
      <Text size="sm" weight="semibold">
        {label}
      </Text>
      <Text size="sm" tone={value ? "default" : "muted"}>
        {value || "Not recorded."}
      </Text>
    </section>
  );
}

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { ErrorState } from "@components/feedback";
import {
  Button,
  Checkbox,
  CountBadge,
  Heading,
  Icon,
  SkeletonText,
  Text,
  TextInput,
} from "@components/ui";

import type { WeeklyOutcome } from "../model/weekPlanner";
import { PlannerMutationStatus } from "./PlannerMutationStatus";
import "./weekly-outcomes.css";

export interface WeeklyOutcomesProps {
  readonly outcomes?: readonly WeeklyOutcome[];
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly onToggleOutcome?: (outcomeId: string, selected: boolean) => void;
  readonly onAddOutcome?: (title: string) => void;
  readonly onMoveOutcome?: (outcomeId: string, direction: "up" | "down") => void;
  readonly onRetryOutcome?: (outcomeId: string) => void;
  readonly editable?: boolean;
  readonly maxSelected?: number;
  readonly className?: string;
}

const MAX_OUTCOME_LENGTH = 200;

export function WeeklyOutcomes({
  outcomes = [],
  loading = false,
  error,
  onRetry,
  onToggleOutcome,
  onAddOutcome,
  onMoveOutcome,
  onRetryOutcome,
  editable = true,
  maxSelected = 20,
  className,
}: WeeklyOutcomesProps) {
  const titleId = useId();
  const [newTitle, setNewTitle] = useState("");
  const [attemptedAdd, setAttemptedAdd] = useState(false);
  const selectedOutcomes = outcomes.filter((outcome) => outcome.selected);
  const selectedIds = new Set(selectedOutcomes.map((outcome) => outcome.id));
  const normalizedTitle = newTitle.trim();
  const titleError = attemptedAdd
    ? normalizedTitle === ""
      ? "Enter an outcome."
      : normalizedTitle.length > MAX_OUTCOME_LENGTH
        ? `Keep the outcome to ${MAX_OUTCOME_LENGTH} characters or fewer.`
        : undefined
    : undefined;

  function addOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedAdd(true);
    if (normalizedTitle === "" || normalizedTitle.length > MAX_OUTCOME_LENGTH) {
      return;
    }
    onAddOutcome?.(normalizedTitle);
    setNewTitle("");
    setAttemptedAdd(false);
  }

  function handleOutcomeKeyDown(event: KeyboardEvent, outcomeId: string) {
    if (!event.altKey || !onMoveOutcome) {
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onMoveOutcome(outcomeId, "up");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onMoveOutcome(outcomeId, "down");
    }
  }

  const rootClass = ["lifeos-weekly-outcomes", className].filter(Boolean).join(" ");

  if (loading) {
    return (
      <section className={rootClass} aria-label="Weekly outcomes" aria-busy="true">
        <SkeletonText lines={4} />
      </section>
    );
  }

  if (error) {
    return (
      <section className={rootClass} aria-label="Weekly outcomes">
        <ErrorState
          scope="region"
          title="Weekly outcomes couldn't load."
          description={error}
          {...(onRetry ? { onRetry } : {})}
        />
      </section>
    );
  }

  return (
    <section className={rootClass} aria-labelledby={titleId}>
      <div className="lifeos-weekly-outcomes__header">
        <div>
          <div className="lifeos-weekly-outcomes__title-row">
            <Heading id={titleId} level={3} size="sm">
              Weekly outcomes
            </Heading>
            <CountBadge count={selectedOutcomes.length} label="selected weekly outcomes" />
          </div>
          <Text size="sm" tone="secondary">
            Choose up to {maxSelected} outcomes that describe what should move forward this week.
          </Text>
        </div>
      </div>

      {editable && onAddOutcome ? (
        <form className="lifeos-weekly-outcomes__add" noValidate onSubmit={addOutcome}>
          <TextInput
            label="Outcome"
            value={newTitle}
            maxLength={MAX_OUTCOME_LENGTH + 1}
            placeholder="Prepare the accessibility review"
            description="Use one short, specific result."
            {...(titleError ? { error: titleError } : {})}
            onChange={(event) => {
              setNewTitle(event.target.value);
              if (attemptedAdd) setAttemptedAdd(false);
            }}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={selectedOutcomes.length >= maxSelected}
          >
            Add outcome
          </Button>
        </form>
      ) : null}

      {outcomes.length === 0 ? (
        <div className="lifeos-weekly-outcomes__empty">
          <Text weight="medium">No outcomes selected</Text>
          <Text size="sm" tone="secondary">
            Add an outcome when you know what should move forward this week.
          </Text>
        </div>
      ) : (
        <ol className="lifeos-weekly-outcomes__list">
          {outcomes.map((outcome) => {
            const selectedIndex = selectedOutcomes.findIndex((item) => item.id === outcome.id);
            const selectionAtLimit =
              !selectedIds.has(outcome.id) && selectedOutcomes.length >= maxSelected;
            const saving = outcome.mutation?.type === "saving";

            return (
              <li key={outcome.id} className="lifeos-weekly-outcomes__item">
                <div className="lifeos-weekly-outcomes__choice">
                  <Checkbox
                    label={outcome.title}
                    checked={outcome.selected}
                    disabled={!editable || !onToggleOutcome || selectionAtLimit || saving}
                    {...(outcome.itemCount === undefined
                      ? {}
                      : {
                          description: `${outcome.itemCount} ${
                            outcome.itemCount === 1 ? "task" : "tasks"
                          }`,
                        })}
                    onChange={(event) => onToggleOutcome?.(outcome.id, event.target.checked)}
                    onKeyDown={(event) => handleOutcomeKeyDown(event, outcome.id)}
                  />
                  <PlannerMutationStatus
                    {...(outcome.mutation ? { mutation: outcome.mutation } : {})}
                    {...(onRetryOutcome
                      ? { onRetry: () => onRetryOutcome(outcome.id), retryLabel: "Retry outcome" }
                      : {})}
                    className="lifeos-weekly-outcomes__mutation"
                  />
                </div>

                {outcome.selected && editable && onMoveOutcome ? (
                  <div
                    className="lifeos-weekly-outcomes__reorder"
                    role="group"
                    aria-label={`Reorder ${outcome.title}`}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={selectedIndex <= 0 || saving}
                      aria-label={`Move ${outcome.title} up`}
                      onClick={() => onMoveOutcome(outcome.id, "up")}
                    >
                      <Icon icon={ArrowUp} decorative size="sm" />
                      Move up
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={selectedIndex === selectedOutcomes.length - 1 || saving}
                      aria-label={`Move ${outcome.title} down`}
                      onClick={() => onMoveOutcome(outcome.id, "down")}
                    >
                      <Icon icon={ArrowDown} decorative size="sm" />
                      Move down
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

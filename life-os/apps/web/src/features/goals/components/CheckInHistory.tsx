import { Badge, Button, Heading, Text } from "@components/ui";
import { EmptyState } from "@components/feedback";
import { formatLocalDate } from "@lib/localDateTime";
import type { GoalCheckIn } from "../model/goal";
import "./check-in-history.css";

export interface CheckInHistoryProps {
  readonly checkIns: readonly GoalCheckIn[];
  readonly unit?: string;
  readonly onAddCheckIn?: () => void;
  readonly className?: string;
}

export function CheckInHistory({ checkIns, unit, onAddCheckIn, className }: CheckInHistoryProps) {
  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );

  return (
    <section
      aria-label="Check-in history"
      className={["check-in-history", className].filter(Boolean).join(" ")}
    >
      <header className="check-in-history__header">
        <Heading level={3} size="sm">
          Check-in History ({checkIns.length})
        </Heading>
        {onAddCheckIn ? (
          <Button variant="secondary" size="sm" onClick={onAddCheckIn}>
            Log Check-in
          </Button>
        ) : null}
      </header>

      {sortedCheckIns.length === 0 ? (
        <EmptyState
          variant="first-use"
          title="No check-ins logged yet"
          description="Track your goal progress over time by recording regular check-ins."
          {...(onAddCheckIn
            ? {
                primaryAction: (
                  <Button variant="primary" size="sm" onClick={onAddCheckIn}>
                    Log First Check-in
                  </Button>
                ),
              }
            : {})}
        />
      ) : (
        <ol className="check-in-history__list">
          {sortedCheckIns.map((checkIn, index) => {
            const previousCheckIn = sortedCheckIns[index + 1];
            const delta = previousCheckIn ? checkIn.value - previousCheckIn.value : null;

            return (
              <li key={checkIn.id} className="check-in-history__item">
                <div className="check-in-history__item-header">
                  <Text size="xs" tone="muted" className="check-in-history__date">
                    {formatLocalDate(
                      checkIn.recordedAt.slice(0, 10) as `${number}-${string}-${string}`,
                      "en-US",
                    )}
                  </Text>
                  <div className="check-in-history__values">
                    <Text size="sm" weight="bold">
                      {checkIn.value.toLocaleString()}
                      {unit ? ` ${unit}` : ""}
                    </Text>
                    {delta !== null ? (
                      <Badge
                        tone={delta >= 0 ? "success" : "warning"}
                        className="check-in-history__delta"
                      >
                        {delta >= 0 ? `+${delta}` : `${delta}`}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {checkIn.note ? (
                  <Text size="sm" tone="muted" className="check-in-history__note">
                    {checkIn.note}
                  </Text>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

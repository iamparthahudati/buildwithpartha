import { Badge, Link, SkeletonCard, Surface, Text, VisuallyHidden } from "@components/ui";
import { ErrorState } from "@components/feedback";

import "./today-review-prompt.css";

export type TodayReviewPeriod = "morning" | "evening";
export type TodayDailyReviewState = "NOT_STARTED" | "DRAFT" | "FINALIZED" | "SKIPPED";

export interface TodayDailyReview {
  readonly state: TodayDailyReviewState;
  /** Canonical Review route for starting, resuming, or opening this period. */
  readonly href: string;
}

export interface TodayReviewData {
  readonly morning: TodayDailyReview;
  readonly evening: TodayDailyReview;
  /** The locally appropriate prompt, decided by the Today data owner. */
  readonly suggestedPeriod?: TodayReviewPeriod;
}

export type TodayReviewStatus =
  | { readonly type: "loading"; readonly data?: TodayReviewData }
  | { readonly type: "error"; readonly message: string; readonly data?: TodayReviewData }
  | { readonly type: "ready"; readonly data: TodayReviewData };

export interface TodayReviewPromptProps {
  readonly status: TodayReviewStatus;
  readonly reviewsHref: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

const STATE_PRESENTATION: Readonly<
  Record<
    TodayDailyReviewState,
    {
      readonly label: string;
      readonly tone: "neutral" | "info" | "success";
      readonly detail: string;
    }
  >
> = Object.freeze({
  NOT_STARTED: {
    label: "Not started",
    tone: "neutral",
    detail: "Ready when it is useful.",
  },
  DRAFT: {
    label: "Draft",
    tone: "info",
    detail: "Your saved draft is ready to continue.",
  },
  FINALIZED: {
    label: "Finalized",
    tone: "success",
    detail: "Finalized for this local date.",
  },
  SKIPPED: {
    label: "Skipped",
    tone: "neutral",
    detail: "Skipped for this local date.",
  },
});

const PERIOD_PRESENTATION: Readonly<
  Record<TodayReviewPeriod, { readonly title: string; readonly duration: string }>
> = Object.freeze({
  morning: { title: "Morning review", duration: "3–5 minutes" },
  evening: { title: "Evening review", duration: "5–10 minutes" },
});

function actionLabel(period: TodayReviewPeriod, state: TodayDailyReviewState): string {
  const periodLabel = period === "morning" ? "morning" : "evening";

  if (state === "NOT_STARTED") return `Start ${periodLabel} review`;
  if (state === "DRAFT") return `Resume ${periodLabel} review`;
  return `Open ${periodLabel} review`;
}

function ReviewRow({
  period,
  review,
  suggested,
}: {
  readonly period: TodayReviewPeriod;
  readonly review: TodayDailyReview;
  readonly suggested: boolean;
}) {
  const state = STATE_PRESENTATION[review.state];
  const presentation = PERIOD_PRESENTATION[period];
  const showSuggestion = suggested && (review.state === "NOT_STARTED" || review.state === "DRAFT");

  return (
    <li className="lifeos-today-review-prompt__row">
      <div className="lifeos-today-review-prompt__row-copy">
        <div className="lifeos-today-review-prompt__row-heading">
          <Text weight="semibold" inline>
            {presentation.title}
          </Text>
          <Badge tone={state.tone}>{state.label}</Badge>
          {showSuggestion ? <Badge tone="info">Suggested now</Badge> : null}
        </div>
        <Text tone="secondary" size="sm">
          {presentation.duration} · {state.detail}
        </Text>
      </div>

      <Link href={review.href} quiet className="lifeos-today-review-prompt__action">
        {actionLabel(period, review.state)}
      </Link>
    </li>
  );
}

/**
 * Morning and evening Daily Review status for Today (LOS-0613).
 *
 * The caller owns local-time prompting and canonical Review routes. Optional
 * last-known data can stay visible during refresh/error states so a failed
 * aggregate request never hides a saved draft or claims it was lost.
 */
export function TodayReviewPrompt({
  status,
  reviewsHref,
  onRetry,
  className,
}: TodayReviewPromptProps) {
  const rootClassName = ["lifeos-today-review-prompt", className].filter(Boolean).join(" ");
  const data = status.data;

  return (
    <Surface
      as="section"
      title="Daily review"
      titleLevel={2}
      titleAction={
        <Link href={reviewsHref} quiet>
          Review history
        </Link>
      }
      className={rootClassName}
    >
      <Text tone="secondary" size="sm" className="lifeos-today-review-prompt__intro">
        Notice what matters, decide what moves forward, and leave the rest without judgment.
      </Text>

      <div aria-busy={status.type === "loading" || undefined}>
        {status.type === "loading" && data === undefined ? (
          <div role="status" aria-label="Loading Daily Review status">
            <VisuallyHidden>Loading Daily Review status.</VisuallyHidden>
            <div className="lifeos-today-review-prompt__skeletons">
              <SkeletonCard lines={1} />
              <SkeletonCard lines={1} />
            </div>
          </div>
        ) : null}

        {status.type === "loading" && data !== undefined ? (
          <Text tone="muted" size="xs" className="lifeos-today-review-prompt__refreshing">
            Refreshing Review status… Last saved state remains available.
          </Text>
        ) : null}

        {status.type === "error" ? (
          <ErrorState
            scope="region"
            title="Daily Review status couldn't refresh."
            description={data ? "Your last saved Review state is still shown." : status.message}
            {...(onRetry ? { onRetry } : {})}
          />
        ) : null}

        {data ? (
          <ul className="lifeos-today-review-prompt__list">
            <ReviewRow
              period="morning"
              review={data.morning}
              suggested={data.suggestedPeriod === "morning"}
            />
            <ReviewRow
              period="evening"
              review={data.evening}
              suggested={data.suggestedPeriod === "evening"}
            />
          </ul>
        ) : null}
      </div>
    </Surface>
  );
}

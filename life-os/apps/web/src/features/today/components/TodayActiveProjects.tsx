import { Plus } from "lucide-react";

import { EmptyState, ErrorState } from "@components/feedback";
import { Button, Link, SkeletonCard, Surface, Text, VisuallyHidden } from "@components/ui";

import { ActiveProjectRow, type TodayActiveProject } from "./ActiveProjectRow";
import "./today-active-projects.css";

export type TodayActiveProjectsStatus =
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string }
  | {
      readonly type: "ready";
      readonly projects: readonly [TodayActiveProject, ...TodayActiveProject[]];
    };

export interface TodayActiveProjectsProps {
  readonly status: TodayActiveProjectsStatus;
  /** Human-readable canonical source for this projection. */
  readonly sourceLabel: string;
  readonly projectsHref: string;
  readonly onAddProject?: () => void;
  readonly onRetry?: () => void;
  /** Today shows only a compact subset; the canonical Projects route owns the full list. */
  readonly visibleLimit?: number;
  readonly className?: string;
}

/**
 * Compact active Projects widget for Today (LOS-0612).
 *
 * Data ownership remains explicit in the footer, every load state is isolated,
 * and the list is deliberately capped so Today never becomes a second Projects
 * inventory. The full list always remains available at the canonical route.
 */
export function TodayActiveProjects({
  status,
  sourceLabel,
  projectsHref,
  onAddProject,
  onRetry,
  visibleLimit = 3,
  className,
}: TodayActiveProjectsProps) {
  const limit = Math.max(1, visibleLimit);
  const rootClassName = ["lifeos-today-active-projects", className].filter(Boolean).join(" ");

  return (
    <Surface
      as="section"
      title="Active projects"
      titleLevel={2}
      titleAction={
        <Link href={projectsHref} quiet>
          View all
        </Link>
      }
      className={rootClassName}
    >
      <div
        className="lifeos-today-active-projects__body"
        aria-busy={status.type === "loading" || undefined}
      >
        {status.type === "loading" ? (
          <div role="status" aria-label="Loading active projects">
            <VisuallyHidden>Loading active projects.</VisuallyHidden>
            <div className="lifeos-today-active-projects__skeletons">
              <SkeletonCard lines={1} withMedia />
              <SkeletonCard lines={1} withMedia />
              <SkeletonCard lines={1} withMedia />
            </div>
          </div>
        ) : null}

        {status.type === "empty" ? (
          <EmptyState
            variant="first-use"
            title="No active projects yet"
            description="Add a project when you have an outcome that needs related tasks and planning."
            icon={false}
            primaryAction={
              onAddProject ? (
                <Button variant="secondary" size="sm" iconStart={Plus} onClick={onAddProject}>
                  Add project
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {status.type === "error" ? (
          <ErrorState
            scope="region"
            title="Active projects couldn't load."
            description={status.message}
            {...(onRetry ? { onRetry } : {})}
          />
        ) : null}

        {status.type === "ready" ? (
          <ul className="lifeos-today-active-projects__list">
            {status.projects.slice(0, limit).map((project) => (
              <ActiveProjectRow key={project.id} project={project} />
            ))}
          </ul>
        ) : null}
      </div>

      <Text tone="muted" size="xs" className="lifeos-today-active-projects__source">
        Source: {sourceLabel}
      </Text>
    </Surface>
  );
}

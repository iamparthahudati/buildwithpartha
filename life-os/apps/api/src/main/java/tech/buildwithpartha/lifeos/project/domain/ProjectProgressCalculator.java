package tech.buildwithpartha.lifeos.project.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** Domain service that computes a project's progress and health based on its tasks. */
public final class ProjectProgressCalculator {

  private ProjectProgressCalculator() {}

  /**
   * Calculates the project progress and health.
   *
   * @param project the project
   * @param tasks the list of tasks associated with the project
   * @param policy the calculation policy (COUNT or WEIGHT)
   * @param now the current time instant to check for overdue tasks
   * @return the calculated ProjectProgress containing percentage and health
   */
  public static ProjectProgress calculate(
      Project project, List<ProjectTask> tasks, ProgressPolicy policy, Instant now) {
    Objects.requireNonNull(project, "project must not be null");
    Objects.requireNonNull(tasks, "tasks must not be null");
    Objects.requireNonNull(policy, "policy must not be null");
    Objects.requireNonNull(now, "now must not be null");

    // Filter out archived and cancelled tasks
    List<ProjectTask> activeTasks =
        tasks.stream().filter(t -> !t.archived() && !t.isCancelled()).toList();

    // 1. Calculate Progress Percentage
    int percentage = 0;
    if (!activeTasks.isEmpty()) {
      if (policy == ProgressPolicy.COUNT) {
        long completed = activeTasks.stream().filter(ProjectTask::isDone).count();
        percentage = calculatePercentage(completed, activeTasks.size());
      } else {
        long completedWeight =
            activeTasks.stream()
                .filter(ProjectTask::isDone)
                .mapToLong(t -> t.estimateMinutes() > 0 ? t.estimateMinutes() : 1L)
                .sum();
        long totalWeight =
            activeTasks.stream()
                .mapToLong(t -> t.estimateMinutes() > 0 ? t.estimateMinutes() : 1L)
                .sum();
        percentage = calculatePercentage(completedWeight, totalWeight);
      }
    }

    // 2. Calculate Health
    ProjectHealth health;
    if (project.status() == ProjectStatus.COMPLETED
        || project.status() == ProjectStatus.CANCELLED) {
      health = ProjectHealth.NOT_SET;
    } else if (project.health() != ProjectHealth.NOT_SET) {
      health = project.health();
    } else if (project.status() == ProjectStatus.ACTIVE) {
      if (activeTasks.isEmpty()) {
        health = ProjectHealth.NOT_SET;
      } else {
        boolean hasOverdue = activeTasks.stream().anyMatch(t -> t.isOverdue(now));
        boolean hasBlocked = activeTasks.stream().anyMatch(ProjectTask::isBlocked);

        if (hasOverdue) {
          health = ProjectHealth.OFF_TRACK;
        } else if (hasBlocked) {
          health = ProjectHealth.AT_RISK;
        } else {
          health = ProjectHealth.ON_TRACK;
        }
      }
    } else {
      health = ProjectHealth.NOT_SET;
    }

    return new ProjectProgress(percentage, health);
  }

  private static int calculatePercentage(long completed, long total) {
    if (total <= 0 || completed <= 0) {
      return 0;
    }
    if (completed >= total) {
      return 100;
    }
    double ratio = (double) completed / total;
    int rounded = (int) Math.round(ratio * 100.0);
    // Honest rounding: prevent 0% if any work is done, and 100% if any work remains.
    return Math.min(99, Math.max(1, rounded));
  }
}

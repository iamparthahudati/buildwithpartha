package tech.buildwithpartha.lifeos.task.domain;

import java.util.List;

/** User-scoped dependency projections for one Task detail aggregate. */
public record TaskDetailDependencies(
    List<TaskDependencySummaryItem> blockers, List<TaskDependencySummaryItem> dependents) {

  public TaskDetailDependencies {
    blockers = List.copyOf(blockers);
    dependents = List.copyOf(dependents);
  }

  public long unresolvedBlockerCount() {
    return blockers.stream().filter(item -> !item.status().isTerminal()).count();
  }

  public boolean isBlocked() {
    return unresolvedBlockerCount() > 0;
  }
}

package tech.buildwithpartha.lifeos.task.domain;

import java.util.List;
import java.util.Objects;

/** Domain record summarizing dependencies for a task (blockers and dependents). */
public record TaskDependenciesSummary(
    List<Task> blockers, List<Task> dependents, boolean isBlocked, long unresolvedBlockerCount) {

  public TaskDependenciesSummary {
    Objects.requireNonNull(blockers, "blockers must not be null");
    Objects.requireNonNull(dependents, "dependents must not be null");

    blockers = List.copyOf(blockers);
    dependents = List.copyOf(dependents);
  }
}

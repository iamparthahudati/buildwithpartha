package tech.buildwithpartha.lifeos.task.api;

import java.util.List;
import tech.buildwithpartha.lifeos.task.domain.TaskDependenciesSummary;
import tech.buildwithpartha.lifeos.task.domain.TaskDetailDependencies;

/** Response DTO containing blocker and dependent lists with derived blocked status summary. */
public record TaskDependenciesSummaryResponse(
    List<TaskDependencyResponse> blockers,
    List<TaskDependencyResponse> dependents,
    boolean isBlocked,
    long unresolvedBlockerCount) {

  public static TaskDependenciesSummaryResponse fromDomain(TaskDependenciesSummary summary) {
    List<TaskDependencyResponse> blockers =
        summary.blockers().stream().map(TaskDependencyResponse::fromDomain).toList();
    List<TaskDependencyResponse> dependents =
        summary.dependents().stream().map(TaskDependencyResponse::fromDomain).toList();

    return new TaskDependenciesSummaryResponse(
        blockers, dependents, summary.isBlocked(), summary.unresolvedBlockerCount());
  }

  public static TaskDependenciesSummaryResponse fromDomain(TaskDetailDependencies dependencies) {
    List<TaskDependencyResponse> blockers =
        dependencies.blockers().stream().map(TaskDependencyResponse::fromDomain).toList();
    List<TaskDependencyResponse> dependents =
        dependencies.dependents().stream().map(TaskDependencyResponse::fromDomain).toList();

    return new TaskDependenciesSummaryResponse(
        blockers, dependents, dependencies.isBlocked(), dependencies.unresolvedBlockerCount());
  }
}

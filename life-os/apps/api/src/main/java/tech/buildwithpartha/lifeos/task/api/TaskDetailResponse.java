package tech.buildwithpartha.lifeos.task.api;

import io.swagger.v3.oas.annotations.media.Schema;
import tech.buildwithpartha.lifeos.task.application.TaskDetailResult;

/** Versioned aggregate response used to bootstrap Task Details. */
public record TaskDetailResponse(
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) TaskResponse task,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        TaskDependenciesSummaryResponse dependencies,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) TaskDetailCountsResponse counts,
    @Schema(
            description =
                "Task optimistic-concurrency version. Send this value in later Task mutations.",
            minimum = "0",
            format = "int64",
            requiredMode = Schema.RequiredMode.REQUIRED)
        long version) {

  public static TaskDetailResponse fromApplication(TaskDetailResult result) {
    return new TaskDetailResponse(
        TaskResponse.fromDomain(result.task()),
        TaskDependenciesSummaryResponse.fromDomain(result.dependencies()),
        TaskDetailCountsResponse.fromApplication(result.counts()),
        result.task().version());
  }
}

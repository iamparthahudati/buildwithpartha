package tech.buildwithpartha.lifeos.task.api;

import io.swagger.v3.oas.annotations.media.Schema;
import tech.buildwithpartha.lifeos.task.application.TaskDetailCounts;

/** Stable count contract for independently loaded Task detail sections. */
public record TaskDetailCountsResponse(
    @Schema(minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED) long linkedTimeBlockCount,
    @Schema(minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED) long focusSessionCount,
    @Schema(minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED) long commentCount,
    @Schema(minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED) long attachmentCount,
    @Schema(minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED) long activityEventCount) {

  public static TaskDetailCountsResponse fromApplication(TaskDetailCounts counts) {
    return new TaskDetailCountsResponse(
        counts.linkedTimeBlockCount(),
        counts.focusSessionCount(),
        counts.commentCount(),
        counts.attachmentCount(),
        counts.activityEventCount());
  }
}

package tech.buildwithpartha.lifeos.task.api;

import java.util.UUID;
import tech.buildwithpartha.lifeos.task.application.BulkTaskItemResult;

/** Safe API projection of one bulk task item outcome. */
public record BulkTaskItemResponse(
    UUID taskId, String outcome, TaskResponse task, String errorCode) {

  static BulkTaskItemResponse fromApplication(BulkTaskItemResult result) {
    return new BulkTaskItemResponse(
        result.taskId(),
        result.succeeded() ? "SUCCEEDED" : "FAILED",
        result.task().map(TaskResponse::fromDomain).orElse(null),
        result.errorCode().orElse(null));
  }
}

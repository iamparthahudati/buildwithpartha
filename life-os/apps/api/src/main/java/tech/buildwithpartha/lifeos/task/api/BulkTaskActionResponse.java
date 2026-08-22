package tech.buildwithpartha.lifeos.task.api;

import java.util.List;
import tech.buildwithpartha.lifeos.task.application.BulkTaskActionResult;

/** Partial-result response for a bulk task action. */
public record BulkTaskActionResponse(
    int requested, int succeeded, int failed, List<BulkTaskItemResponse> results) {

  static BulkTaskActionResponse fromApplication(BulkTaskActionResult result) {
    return new BulkTaskActionResponse(
        result.requested(),
        result.succeeded(),
        result.failed(),
        result.results().stream().map(BulkTaskItemResponse::fromApplication).toList());
  }
}

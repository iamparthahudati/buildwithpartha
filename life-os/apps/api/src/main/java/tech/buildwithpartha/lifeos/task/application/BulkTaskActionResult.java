package tech.buildwithpartha.lifeos.task.application;

import java.util.List;
import java.util.Objects;

/** Aggregate result preserving the request order and every per-item outcome. */
public record BulkTaskActionResult(
    int requested, int succeeded, int failed, List<BulkTaskItemResult> results) {

  public BulkTaskActionResult {
    Objects.requireNonNull(results, "results must not be null");
    results = List.copyOf(results);
    if (requested != results.size() || succeeded + failed != requested) {
      throw new IllegalArgumentException("bulk result counts must match item results");
    }
  }
}

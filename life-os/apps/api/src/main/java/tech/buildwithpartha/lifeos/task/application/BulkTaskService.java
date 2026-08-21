package tech.buildwithpartha.lifeos.task.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.StandardErrorCodes;
import tech.buildwithpartha.lifeos.task.domain.Task;

/** Coordinates bounded bulk task mutations while preserving independent per-item outcomes. */
@Service
public class BulkTaskService {

  private final BulkTaskItemExecutor itemExecutor;

  public BulkTaskService(BulkTaskItemExecutor itemExecutor) {
    this.itemExecutor = itemExecutor;
  }

  public BulkTaskActionResult apply(
      UUID userId, List<UUID> taskIds, BulkTaskActionCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskIds, "taskIds must not be null");
    Objects.requireNonNull(command, "command must not be null");

    List<BulkTaskItemResult> results = new ArrayList<>(taskIds.size());
    for (UUID taskId : taskIds) {
      results.add(applyOne(userId, taskId, command));
    }

    int succeeded = (int) results.stream().filter(BulkTaskItemResult::succeeded).count();
    return new BulkTaskActionResult(results.size(), succeeded, results.size() - succeeded, results);
  }

  private BulkTaskItemResult applyOne(UUID userId, UUID taskId, BulkTaskActionCommand command) {
    try {
      Task task = itemExecutor.execute(userId, taskId, command);
      return BulkTaskItemResult.succeeded(task);
    } catch (CodedException exception) {
      return BulkTaskItemResult.failed(taskId, exception.code().value());
    } catch (OptimisticLockingFailureException exception) {
      return BulkTaskItemResult.failed(taskId, StandardErrorCodes.CONCURRENCY_CONFLICT.value());
    } catch (RuntimeException exception) {
      return BulkTaskItemResult.failed(taskId, StandardErrorCodes.INTERNAL_ERROR.value());
    }
  }
}

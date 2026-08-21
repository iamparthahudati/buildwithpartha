package tech.buildwithpartha.lifeos.task.domain;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;

/** Cycle detection validator for directed task dependency graph. */
public final class DependencyCycleValidator {

  private DependencyCycleValidator() {}

  /**
   * Validates whether adding a directed edge (blockingTaskId -> blockedTaskId) creates a cycle.
   *
   * @param existingDependencies list of existing task dependencies in the graph
   * @param blockingTaskId ID of the task that blocks (edge origin)
   * @param blockedTaskId ID of the task that is blocked (edge target)
   * @return true if adding the edge would create a cycle; false otherwise
   */
  public static boolean wouldCreateCycle(
      List<TaskDependency> existingDependencies, UUID blockingTaskId, UUID blockedTaskId) {

    Objects.requireNonNull(existingDependencies, "existingDependencies must not be null");
    Objects.requireNonNull(blockingTaskId, "blockingTaskId must not be null");
    Objects.requireNonNull(blockedTaskId, "blockedTaskId must not be null");

    if (blockingTaskId.equals(blockedTaskId)) {
      return true;
    }

    // Build adjacency list: node -> list of nodes it blocks (downstream dependents)
    Map<UUID, List<UUID>> graph = new HashMap<>();
    for (TaskDependency dep : existingDependencies) {
      graph.computeIfAbsent(dep.blockingTaskId(), k -> new ArrayList<>()).add(dep.blockedTaskId());
    }

    // Traverse starting from blockedTaskId to see if we can reach blockingTaskId
    Queue<UUID> queue = new ArrayDeque<>();
    Set<UUID> visited = new HashSet<>();

    queue.add(blockedTaskId);
    visited.add(blockedTaskId);

    while (!queue.isEmpty()) {
      UUID current = queue.poll();

      if (current.equals(blockingTaskId)) {
        return true;
      }

      List<UUID> neighbors = graph.getOrDefault(current, List.of());
      for (UUID neighbor : neighbors) {
        if (!visited.contains(neighbor)) {
          visited.add(neighbor);
          queue.add(neighbor);
        }
      }
    }

    return false;
  }
}

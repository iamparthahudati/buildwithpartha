package tech.buildwithpartha.lifeos.task.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TaskDependencyDomainTests {

  private static final Instant NOW = Instant.parse("2026-08-21T10:00:00Z");

  @Test
  @DisplayName("TaskDependency record prevents self dependency")
  void preventsSelfDependency() {
    UUID taskId = UUID.randomUUID();

    assertThatThrownBy(() -> new TaskDependency(taskId, taskId, NOW))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Task cannot depend on itself");
  }

  @Test
  @DisplayName("TaskDependency record holds valid properties")
  void holdsValidProperties() {
    UUID taskA = UUID.randomUUID();
    UUID taskB = UUID.randomUUID();

    TaskDependency dep = new TaskDependency(taskA, taskB, NOW);

    assertThat(dep.blockingTaskId()).isEqualTo(taskA);
    assertThat(dep.blockedTaskId()).isEqualTo(taskB);
    assertThat(dep.createdAt()).isEqualTo(NOW);
  }

  @Test
  @DisplayName("DependencyCycleValidator detects self dependency cycle")
  void detectsSelfCycle() {
    UUID taskA = UUID.randomUUID();

    boolean cycle = DependencyCycleValidator.wouldCreateCycle(List.of(), taskA, taskA);

    assertThat(cycle).isTrue();
  }

  @Test
  @DisplayName("DependencyCycleValidator detects direct cycle A -> B -> A")
  void detectsDirectCycle() {
    UUID taskA = UUID.randomUUID();
    UUID taskB = UUID.randomUUID();

    // Existing: A blocks B (A -> B)
    TaskDependency existing = new TaskDependency(taskA, taskB, NOW);

    // Attempt to add B blocks A (B -> A)
    boolean cycle = DependencyCycleValidator.wouldCreateCycle(List.of(existing), taskB, taskA);

    assertThat(cycle).isTrue();
  }

  @Test
  @DisplayName("DependencyCycleValidator detects transitive cycle A -> B -> C -> A")
  void detectsTransitiveCycle() {
    UUID taskA = UUID.randomUUID();
    UUID taskB = UUID.randomUUID();
    UUID taskC = UUID.randomUUID();

    // Existing: A -> B, B -> C
    TaskDependency dep1 = new TaskDependency(taskA, taskB, NOW);
    TaskDependency dep2 = new TaskDependency(taskB, taskC, NOW);

    // Attempt to add C -> A
    boolean cycle = DependencyCycleValidator.wouldCreateCycle(List.of(dep1, dep2), taskC, taskA);

    assertThat(cycle).isTrue();
  }

  @Test
  @DisplayName("DependencyCycleValidator allows valid acyclic dependency addition")
  void allowsValidAcyclicAddition() {
    UUID taskA = UUID.randomUUID();
    UUID taskB = UUID.randomUUID();
    UUID taskC = UUID.randomUUID();

    // Existing: A -> B
    TaskDependency dep1 = new TaskDependency(taskA, taskB, NOW);

    // Attempt to add B -> C (A -> B -> C)
    boolean cycle = DependencyCycleValidator.wouldCreateCycle(List.of(dep1), taskB, taskC);

    assertThat(cycle).isFalse();
  }
}

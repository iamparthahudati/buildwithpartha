package tech.buildwithpartha.lifeos.task.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.task.domain.TaskDependency;

class TaskDependencyInfrastructureTests {

  @Test
  @DisplayName("TaskDependencyId equals and hashCode contract")
  void testTaskDependencyIdEqualsAndHashCode() {
    UUID blocking = UUID.randomUUID();
    UUID blocked = UUID.randomUUID();

    TaskDependencyId id1 = new TaskDependencyId(blocking, blocked);
    TaskDependencyId id2 = new TaskDependencyId(blocking, blocked);
    TaskDependencyId diff1 = new TaskDependencyId(UUID.randomUUID(), blocked);
    TaskDependencyId diff2 = new TaskDependencyId(blocking, UUID.randomUUID());
    TaskDependencyId empty = new TaskDependencyId();

    assertThat(id1).isEqualTo(id1);
    assertThat(id1).isEqualTo(id2);
    assertThat(id1.hashCode()).isEqualTo(id2.hashCode());

    assertThat(id1).isNotEqualTo(diff1);
    assertThat(id1).isNotEqualTo(diff2);
    assertThat(id1).isNotEqualTo(null);
    assertThat(id1).isNotEqualTo("some string");
    assertThat(empty.getBlockingTaskId()).isNull();
    assertThat(empty.getBlockedTaskId()).isNull();
  }

  @Test
  @DisplayName("TaskDependencyEntity mapping, equals and hashCode contract")
  void testTaskDependencyEntityMappingEqualsAndHashCode() {
    UUID blocking = UUID.randomUUID();
    UUID blocked = UUID.randomUUID();
    Instant now = Instant.now();

    TaskDependency domain = new TaskDependency(blocking, blocked, now);
    TaskDependencyEntity entity = TaskDependencyEntity.fromDomain(domain);

    assertThat(entity.getId()).isEqualTo(new TaskDependencyId(blocking, blocked));
    assertThat(entity.getCreatedAt()).isEqualTo(now);
    assertThat(entity.toDomain()).isEqualTo(domain);

    TaskDependencyEntity sameEntity = TaskDependencyEntity.fromDomain(domain);
    TaskDependencyEntity diffEntity =
        TaskDependencyEntity.fromDomain(new TaskDependency(UUID.randomUUID(), blocked, now));
    TaskDependencyEntity emptyEntity = new TaskDependencyEntity();

    assertThat(entity).isEqualTo(entity);
    assertThat(entity).isEqualTo(sameEntity);
    assertThat(entity.hashCode()).isEqualTo(sameEntity.hashCode());

    assertThat(entity).isNotEqualTo(diffEntity);
    assertThat(entity).isNotEqualTo(null);
    assertThat(entity).isNotEqualTo("some string");
    assertThat(emptyEntity.getId()).isNull();
    assertThat(emptyEntity.getCreatedAt()).isNull();
  }
}

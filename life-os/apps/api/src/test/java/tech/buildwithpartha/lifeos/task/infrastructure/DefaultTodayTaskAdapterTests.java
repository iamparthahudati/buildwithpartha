package tech.buildwithpartha.lifeos.task.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.ProjectTaskCountRecord;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayOverdueRecord;
import tech.buildwithpartha.lifeos.common.task.TodayTaskPort.TodayTaskRecord;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

class DefaultTodayTaskAdapterTests {

  private TaskJpaRepository taskJpaRepository;
  private EntityManager entityManager;
  private DefaultTodayTaskAdapter adapter;

  @BeforeEach
  void setUp() {
    taskJpaRepository = mock(TaskJpaRepository.class);
    entityManager = mock(EntityManager.class);
    adapter = new DefaultTodayTaskAdapter(taskJpaRepository, entityManager);
  }

  @Test
  void retrievesMitTask() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    LocalDate date = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    TaskEntity entity =
        new TaskEntity(
            taskId,
            userId,
            null,
            "Main Task",
            "Desc",
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Instant.parse("2026-09-10T15:00:00Z"),
            60,
            0,
            0,
            date,
            0,
            null,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(),
            null,
            null,
            1L);

    given(taskJpaRepository.findByUserIdAndMitDate(userId, date)).willReturn(List.of(entity));

    Optional<TodayTaskRecord> result = adapter.getMitTask(userId, date, zoneId);

    assertThat(result).isPresent();
    assertThat(result.get().id()).isEqualTo(taskId);
    assertThat(result.get().title()).isEqualTo("Main Task");
    assertThat(result.get().priority()).isEqualTo("P1");
  }

  @Test
  void ignoresDeletedOrArchivedMitTasks() {
    UUID userId = UUID.randomUUID();
    LocalDate date = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");

    TaskEntity deleted =
        new TaskEntity(
            UUID.randomUUID(),
            userId,
            null,
            "Deleted",
            null,
            TaskStatus.TO_DO,
            TaskPriority.P1,
            null,
            0,
            0,
            0,
            date,
            0,
            null,
            Instant.now(),
            Instant.now(),
            Instant.now(),
            Set.of(),
            null,
            null,
            1L);

    given(taskJpaRepository.findByUserIdAndMitDate(userId, date)).willReturn(List.of(deleted));

    Optional<TodayTaskRecord> result = adapter.getMitTask(userId, date, zoneId);

    assertThat(result).isEmpty();
  }

  @Test
  void retrievesTasksDueToday() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    LocalDate date = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant now = Instant.parse("2026-09-10T12:00:00Z");

    TaskEntity entity =
        new TaskEntity(
            taskId,
            userId,
            null,
            "Due Task",
            null,
            TaskStatus.IN_PROGRESS,
            TaskPriority.P2,
            Instant.parse("2026-09-10T18:00:00Z"),
            30,
            0,
            0,
            null,
            0,
            null,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(),
            null,
            null,
            1L);

    TaskEntity mitOnly =
        new TaskEntity(
            UUID.randomUUID(),
            userId,
            null,
            "MIT Only",
            null,
            TaskStatus.DONE,
            TaskPriority.P3,
            null,
            30,
            30,
            100,
            date,
            1,
            null,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(),
            null,
            null,
            1L);

    given(taskJpaRepository.findByUserId(userId)).willReturn(List.of(entity, mitOnly));

    List<TodayTaskRecord> result = adapter.getTasksDueToday(userId, date, zoneId, now, 20);

    assertThat(result).hasSize(2);
    assertThat(result.get(0).title()).isEqualTo("Due Task");
    assertThat(result.get(1).title()).isEqualTo("MIT Only");
  }

  @Test
  void retrievesOverdueTasks() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    LocalDate date = LocalDate.of(2026, 9, 10);
    ZoneId zoneId = ZoneId.of("UTC");
    Instant now = Instant.parse("2026-09-10T12:00:00Z");

    TaskEntity overdueEntity =
        new TaskEntity(
            taskId,
            userId,
            null,
            "Late Task",
            null,
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Instant.parse("2026-09-09T18:00:00Z"),
            30,
            0,
            0,
            null,
            0,
            null,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(),
            null,
            null,
            1L);

    TaskEntity cancelledOverdue =
        new TaskEntity(
            UUID.randomUUID(),
            userId,
            null,
            "Cancelled Late Task",
            null,
            TaskStatus.CANCELLED,
            TaskPriority.P1,
            Instant.parse("2026-09-09T18:00:00Z"),
            30,
            0,
            0,
            null,
            0,
            null,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(),
            null,
            null,
            1L);

    given(taskJpaRepository.findByUserId(userId))
        .willReturn(List.of(overdueEntity, cancelledOverdue));

    TodayOverdueRecord result = adapter.getOverdueTasks(userId, now, zoneId, 5);

    assertThat(result.totalCount()).isEqualTo(1);
    assertThat(result.topOverdueTasks()).hasSize(1);
    assertThat(result.topOverdueTasks().get(0).isOverdue()).isTrue();
  }

  @Test
  void retrievesProjectTaskCounts() {
    UUID userId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Query query = mock(Query.class);

    given(entityManager.createNativeQuery(anyString())).willReturn(query);
    given(query.setParameter(anyString(), any())).willReturn(query);
    given(query.getResultList())
        .willReturn(Collections.singletonList(new Object[] {projectId.toString(), 10L, 4L}));

    Map<UUID, ProjectTaskCountRecord> counts = adapter.getProjectTaskCounts(userId);

    assertThat(counts).hasSize(1);
    assertThat(counts.get(projectId).totalCount()).isEqualTo(10);
    assertThat(counts.get(projectId).completedCount()).isEqualTo(4);
  }

  @Test
  void retrievesCompletedTasksCountToday() {
    UUID userId = UUID.randomUUID();
    Instant start = Instant.parse("2026-09-10T00:00:00Z");
    Instant end = Instant.parse("2026-09-11T00:00:00Z");
    Query query = mock(Query.class);

    given(entityManager.createNativeQuery(anyString())).willReturn(query);
    given(query.setParameter(anyString(), any())).willReturn(query);
    given(query.getSingleResult()).willReturn(3L);

    int count = adapter.getCompletedTasksCountToday(userId, start, end);

    assertThat(count).isEqualTo(3);
  }
}

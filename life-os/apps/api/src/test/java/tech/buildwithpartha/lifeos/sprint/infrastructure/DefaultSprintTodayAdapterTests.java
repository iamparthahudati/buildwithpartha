package tech.buildwithpartha.lifeos.sprint.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.sprint.SprintTodayPort.TodaySprintSummary;
import tech.buildwithpartha.lifeos.sprint.domain.Sprint;
import tech.buildwithpartha.lifeos.sprint.domain.SprintRepository;
import tech.buildwithpartha.lifeos.sprint.domain.SprintStatus;
import tech.buildwithpartha.lifeos.sprint.domain.SprintTask;

class DefaultSprintTodayAdapterTests {

  private SprintRepository sprintRepository;
  private EntityManager entityManager;
  private DefaultSprintTodayAdapter adapter;

  @BeforeEach
  void setUp() {
    sprintRepository = mock(SprintRepository.class);
    entityManager = mock(EntityManager.class);
    adapter = new DefaultSprintTodayAdapter(sprintRepository, entityManager);
  }

  @Test
  void retrievesActiveSprintSummary() {
    UUID userId = UUID.randomUUID();
    UUID sprintId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);

    SprintTask task =
        new SprintTask(
            UUID.randomUUID(),
            taskId,
            5,
            1,
            false,
            Instant.now(),
            Optional.empty(),
            Optional.empty());

    Sprint sprint =
        new Sprint(
            sprintId,
            userId,
            "Sprint 10",
            Optional.empty(),
            LocalDate.of(2026, 9, 7),
            LocalDate.of(2026, 9, 20),
            SprintStatus.ACTIVE,
            20,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            List.of(),
            1,
            0,
            0,
            0,
            0,
            5,
            0,
            Optional.empty(),
            Instant.now(),
            Instant.now(),
            List.of(task),
            List.of(),
            1L);

    Query query = mock(Query.class);
    given(sprintRepository.findByUserId(userId)).willReturn(List.of(sprint));
    given(entityManager.createNativeQuery(anyString())).willReturn(query);
    given(query.setParameter(anyString(), any())).willReturn(query);
    given(query.getSingleResult()).willReturn(5L);

    Optional<TodaySprintSummary> result = adapter.getActiveSprint(userId, today);

    assertThat(result).isPresent();
    assertThat(result.get().name()).isEqualTo("Sprint 10");
    assertThat(result.get().completedStoryPoints()).isEqualTo(5);
    assertThat(result.get().totalStoryPoints()).isEqualTo(5);
  }

  @Test
  void fallsBackToAnyActiveSprintWhenDatesDoNotCoverToday() {
    UUID userId = UUID.randomUUID();
    UUID sprintId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);

    Sprint sprint =
        new Sprint(
            sprintId,
            userId,
            "Future Active Sprint",
            Optional.empty(),
            LocalDate.of(2026, 9, 15),
            LocalDate.of(2026, 9, 30),
            SprintStatus.ACTIVE,
            20,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            List.of(),
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            Optional.empty(),
            Instant.now(),
            Instant.now(),
            List.of(),
            List.of(),
            1L);

    Query query = mock(Query.class);
    given(sprintRepository.findByUserId(userId)).willReturn(List.of(sprint));
    given(entityManager.createNativeQuery(anyString())).willReturn(query);
    given(query.setParameter(anyString(), any())).willReturn(query);
    given(query.getSingleResult()).willReturn(null);

    Optional<TodaySprintSummary> result = adapter.getActiveSprint(userId, today);

    assertThat(result).isPresent();
    assertThat(result.get().name()).isEqualTo("Future Active Sprint");
    assertThat(result.get().completedStoryPoints()).isEqualTo(0);
  }

  @Test
  void returnsEmptyWhenNoActiveSprintExists() {
    UUID userId = UUID.randomUUID();
    LocalDate today = LocalDate.of(2026, 9, 10);

    given(sprintRepository.findByUserId(userId)).willReturn(List.of());

    Optional<TodaySprintSummary> result = adapter.getActiveSprint(userId, today);

    assertThat(result).isEmpty();
  }
}

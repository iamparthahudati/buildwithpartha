package tech.buildwithpartha.lifeos.project.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort.TodayProjectSummary;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

class DefaultProjectTodayAdapterTests {

  private ProjectJpaRepository projectJpaRepository;
  private DefaultProjectTodayAdapter adapter;

  @BeforeEach
  void setUp() {
    projectJpaRepository = mock(ProjectJpaRepository.class);
    adapter = new DefaultProjectTodayAdapter(projectJpaRepository);
  }

  @Test
  void retrievesActiveProjects() {
    UUID userId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();

    ProjectEntity entity =
        new ProjectEntity(
            projectId,
            userId,
            "Active Alpha",
            "Description",
            ProjectStatus.ACTIVE,
            ProjectPriority.P1,
            ProjectHealth.ON_TRACK,
            "#3B82F6",
            "folder",
            null,
            LocalDate.of(2026, 9, 1),
            LocalDate.of(2026, 9, 30),
            120,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(),
            1L);

    given(projectJpaRepository.findByUserId(userId)).willReturn(List.of(entity));

    List<TodayProjectSummary> result = adapter.getActiveProjects(userId, 5);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).name()).isEqualTo("Active Alpha");
    assertThat(result.get(0).color()).isEqualTo("#3B82F6");
    assertThat(result.get(0).status()).isEqualTo("ACTIVE");
  }

  @Test
  void retrievesProjectSummariesMap() {
    UUID userId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();

    ProjectEntity entity =
        new ProjectEntity(
            projectId,
            userId,
            "Project Beta",
            null,
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.ON_TRACK,
            "#10B981",
            null,
            null,
            null,
            null,
            null,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(),
            1L);

    given(projectJpaRepository.findByUserId(userId)).willReturn(List.of(entity));

    Map<UUID, TodayProjectSummary> result = adapter.getProjectSummaries(userId);

    assertThat(result).containsKey(projectId);
    assertThat(result.get(projectId).name()).isEqualTo("Project Beta");
  }
}

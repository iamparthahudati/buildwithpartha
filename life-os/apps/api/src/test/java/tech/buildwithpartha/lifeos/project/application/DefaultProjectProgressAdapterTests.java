package tech.buildwithpartha.lifeos.project.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.buildwithpartha.lifeos.common.progress.ProjectProgressPort;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

@ExtendWith(MockitoExtension.class)
class DefaultProjectProgressAdapterTests {

  @Mock private ProjectRepository projectRepository;

  private DefaultProjectProgressAdapter adapter;
  private UUID userId;

  @BeforeEach
  void setUp() {
    adapter = new DefaultProjectProgressAdapter(projectRepository);
    userId = UUID.randomUUID();
  }

  @Test
  void aggregatesProjectProgressAcrossStatuses() {
    Instant now = Instant.now();
    UUID labelId = UUID.randomUUID();

    Project p1 =
        new Project(
            UUID.randomUUID(),
            userId,
            "P1",
            Optional.empty(),
            ProjectStatus.COMPLETED,
            ProjectPriority.P1,
            ProjectHealth.ON_TRACK,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            Set.of(labelId),
            0L);

    Project p2 =
        new Project(
            UUID.randomUUID(),
            userId,
            "P2",
            Optional.empty(),
            ProjectStatus.ACTIVE,
            ProjectPriority.P2,
            ProjectHealth.ON_TRACK,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            Set.of(labelId),
            0L);

    Project p3Archived =
        new Project(
            UUID.randomUUID(),
            userId,
            "P3",
            Optional.empty(),
            ProjectStatus.ACTIVE,
            ProjectPriority.P3,
            ProjectHealth.ON_TRACK,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.of(now),
            now,
            now,
            Set.of(labelId),
            0L);

    when(projectRepository.findByUserId(userId)).thenReturn(List.of(p1, p2, p3Archived));

    ProjectProgressPort.ProjectProgressData data =
        adapter.getProjectProgress(userId, null, labelId);

    assertEquals(2, data.totalCount());
    assertEquals(1, data.statusCounts().get("COMPLETED"));
    assertEquals(1, data.statusCounts().get("ACTIVE"));
    assertEquals(75.0, data.averageProgressPercentage());
  }

  @Test
  void returnsZeroProgressWhenNoProjectsFound() {
    when(projectRepository.findByUserId(userId)).thenReturn(List.of());

    ProjectProgressPort.ProjectProgressData data = adapter.getProjectProgress(userId, null, null);

    assertEquals(0, data.totalCount());
    assertEquals(0.0, data.averageProgressPercentage());
  }
}

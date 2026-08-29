package tech.buildwithpartha.lifeos.project.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.progress.ProjectProgressPort;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

/** Project-owned implementation of ProjectProgressPort (LOS-1106). */
@Service
public class DefaultProjectProgressAdapter implements ProjectProgressPort {

  private final ProjectRepository projectRepository;

  public DefaultProjectProgressAdapter(ProjectRepository projectRepository) {
    this.projectRepository = projectRepository;
  }

  @Override
  public ProjectProgressData getProjectProgress(UUID userId, UUID projectId, UUID labelId) {
    List<Project> projects = projectRepository.findByUserId(userId);
    List<Project> filtered =
        projects.stream()
            .filter(p -> p.archivedAt().isEmpty())
            .filter(p -> projectId == null || p.id().equals(projectId))
            .filter(p -> labelId == null || p.labelIds().contains(labelId))
            .toList();

    int totalCount = filtered.size();

    Map<String, Integer> statusCounts = new LinkedHashMap<>();
    for (ProjectStatus status : ProjectStatus.values()) {
      statusCounts.put(status.name(), 0);
    }
    for (Project p : filtered) {
      statusCounts.put(p.status().name(), statusCounts.get(p.status().name()) + 1);
    }

    Double avgProgress = 0.0;
    if (totalCount > 0) {
      double sum = 0.0;
      for (Project p : filtered) {
        if (p.status() == ProjectStatus.COMPLETED) {
          sum += 100.0;
        } else if (p.status() == ProjectStatus.ACTIVE || p.status() == ProjectStatus.PLANNED) {
          sum += 50.0;
        }
      }
      avgProgress =
          BigDecimal.valueOf(sum / totalCount).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    return new ProjectProgressData(totalCount, statusCounts, avgProgress);
  }
}

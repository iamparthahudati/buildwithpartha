package tech.buildwithpartha.lifeos.project.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneRepository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;

/** Contributes project and milestone data to user data export archives (LOS-1512). */
@Component
public class ProjectExportContributor implements UserDataExportContributor {

  private final ProjectRepository projectRepository;
  private final MilestoneRepository milestoneRepository;
  private final ObjectMapper objectMapper;

  public ProjectExportContributor(
      ProjectRepository projectRepository, MilestoneRepository milestoneRepository) {
    this.projectRepository = projectRepository;
    this.milestoneRepository = milestoneRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "projects.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Project> projects = projectRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Project project : projects) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", project.id().toString());
      data.put("name", project.name());
      data.put("description", project.description().orElse(null));
      data.put("status", project.status().name());
      data.put("priority", project.priority().name());
      data.put("health", project.health().name());
      data.put("color", project.color().orElse(null));
      data.put("icon", project.icon().orElse(null));
      data.put("coverImageUrl", project.coverImageUrl().orElse(null));
      data.put("startDate", project.startDate().map(LocalDate::toString).orElse(null));
      data.put("deadlineDate", project.deadlineDate().map(LocalDate::toString).orElse(null));
      data.put("estimateMinutes", project.estimateMinutes().orElse(null));
      data.put("archivedAt", project.archivedAt().map(Instant::toString).orElse(null));
      data.put("createdAt", project.createdAt().toString());
      data.put("updatedAt", project.updatedAt().toString());
      data.put("labelIds", project.labelIds().stream().map(UUID::toString).toList());

      List<Milestone> milestones = milestoneRepository.findByProjectId(project.id());
      List<Map<String, Object>> milestoneRecords = new ArrayList<>();
      for (Milestone milestone : milestones) {
        Map<String, Object> milestoneData = new LinkedHashMap<>();
        milestoneData.put("id", milestone.id().toString());
        milestoneData.put("title", milestone.title());
        milestoneData.put("date", milestone.date().map(LocalDate::toString).orElse(null));
        milestoneData.put("status", milestone.status().name());
        milestoneData.put("ordering", milestone.ordering());
        milestoneData.put("createdAt", milestone.createdAt().toString());
        milestoneData.put("updatedAt", milestone.updatedAt().toString());
        milestoneRecords.add(milestoneData);
      }
      data.put("milestones", milestoneRecords);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize projects export data", e);
    }
  }
}

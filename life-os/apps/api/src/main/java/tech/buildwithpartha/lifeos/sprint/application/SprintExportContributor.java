package tech.buildwithpartha.lifeos.sprint.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.sprint.domain.Sprint;
import tech.buildwithpartha.lifeos.sprint.domain.SprintRepository;
import tech.buildwithpartha.lifeos.sprint.domain.SprintTask;

/**
 * Contributes sprint planning and retrospective history to user data export archives (LOS-1512).
 */
@Component
public class SprintExportContributor implements UserDataExportContributor {

  private final SprintRepository sprintRepository;
  private final ObjectMapper objectMapper;

  public SprintExportContributor(SprintRepository sprintRepository) {
    this.sprintRepository = sprintRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "sprints.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Sprint> sprints = sprintRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Sprint sprint : sprints) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", sprint.id().toString());
      data.put("name", sprint.name());
      data.put("goal", sprint.goal().orElse(null));
      data.put("startDate", sprint.startDate().toString());
      data.put("endDate", sprint.endDate().toString());
      data.put("status", sprint.status().name());
      data.put("targetCapacityPoints", sprint.targetCapacityPoints());
      data.put("retrospectiveNotes", sprint.retrospectiveNotes().orElse(null));
      data.put("whatWentWell", sprint.whatWentWell().orElse(null));
      data.put("whatCouldBeImproved", sprint.whatCouldBeImproved().orElse(null));
      data.put("actionItems", sprint.actionItems());
      data.put("committedTaskCount", sprint.committedTaskCount());
      data.put("completedTaskCount", sprint.completedTaskCount());
      data.put("totalStoryPoints", sprint.totalStoryPoints());
      data.put("completedStoryPoints", sprint.completedStoryPoints());
      data.put("completedAt", sprint.completedAt().map(Instant::toString).orElse(null));
      data.put("createdAt", sprint.createdAt().toString());
      data.put("updatedAt", sprint.updatedAt().toString());

      List<Map<String, Object>> taskRecords = new ArrayList<>();
      for (SprintTask task : sprint.tasks()) {
        Map<String, Object> taskData = new LinkedHashMap<>();
        taskData.put("id", task.id().toString());
        taskData.put("taskId", task.taskId().toString());
        taskData.put("storyPoints", task.storyPoints());
        taskData.put("position", task.position());
        taskData.put("addedAfterStart", task.addedAfterStart());
        taskData.put("active", task.active());
        taskData.put("committedAt", task.committedAt().toString());
        taskData.put("removedAt", task.removedAt().map(Instant::toString).orElse(null));
        taskData.put(
            "carriedOverToSprintId", task.carriedOverToSprintId().map(UUID::toString).orElse(null));
        taskRecords.add(taskData);
      }
      data.put("tasks", taskRecords);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize sprints export data", e);
    }
  }
}

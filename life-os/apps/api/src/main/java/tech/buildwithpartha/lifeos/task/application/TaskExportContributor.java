package tech.buildwithpartha.lifeos.task.application;

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
import tech.buildwithpartha.lifeos.task.domain.Subtask;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Contributes task and subtask data to user data export archives (LOS-1512). */
@Component
public class TaskExportContributor implements UserDataExportContributor {

  private final TaskRepository taskRepository;
  private final ObjectMapper objectMapper;

  public TaskExportContributor(TaskRepository taskRepository) {
    this.taskRepository = taskRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "tasks.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Task> tasks = taskRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Task task : tasks) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", task.id().toString());
      data.put("title", task.title());
      data.put("description", task.description().orElse(null));
      data.put("status", task.status().name());
      data.put("priority", task.priority().name());
      data.put("projectId", task.projectId().map(UUID::toString).orElse(null));
      data.put("dueAt", task.dueAt().map(Instant::toString).orElse(null));
      data.put("estimateMinutes", task.estimateMinutes());
      data.put("spentMinutes", task.spentMinutes());
      data.put("progress", task.progress());
      data.put("mitDate", task.mitDate().map(LocalDate::toString).orElse(null));
      data.put("position", task.position());
      data.put("archivedAt", task.archivedAt().map(Instant::toString).orElse(null));
      data.put("deletedAt", task.deletedAt().map(Instant::toString).orElse(null));
      data.put("createdAt", task.createdAt().toString());
      data.put("updatedAt", task.updatedAt().toString());
      data.put("labelIds", task.labelIds().stream().map(UUID::toString).toList());
      data.put("recurringSeriesId", task.recurringSeriesId().map(UUID::toString).orElse(null));
      data.put(
          "recurrenceOccurrenceDate",
          task.recurrenceOccurrenceDate().map(LocalDate::toString).orElse(null));

      List<Map<String, Object>> subtasks = new ArrayList<>();
      for (Subtask subtask : task.subtasks()) {
        Map<String, Object> subtaskData = new LinkedHashMap<>();
        subtaskData.put("id", subtask.id().toString());
        subtaskData.put("title", subtask.title());
        subtaskData.put("completed", subtask.completed());
        subtaskData.put("position", subtask.position());
        subtaskData.put("createdAt", subtask.createdAt().toString());
        subtaskData.put("updatedAt", subtask.updatedAt().toString());
        subtasks.add(subtaskData);
      }
      data.put("subtasks", subtasks);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize tasks export data", e);
    }
  }
}

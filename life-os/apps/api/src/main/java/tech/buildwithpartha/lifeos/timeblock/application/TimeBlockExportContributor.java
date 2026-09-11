package tech.buildwithpartha.lifeos.timeblock.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;

/** Contributes time block schedule data to user data export archives (LOS-1512). */
@Component
public class TimeBlockExportContributor implements UserDataExportContributor {

  private final TimeBlockRepository timeBlockRepository;
  private final ObjectMapper objectMapper;

  public TimeBlockExportContributor(TimeBlockRepository timeBlockRepository) {
    this.timeBlockRepository = timeBlockRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "timeblocks.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<TimeBlock> timeBlocks = timeBlockRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (TimeBlock block : timeBlocks) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", block.id().toString());
      data.put("title", block.title());
      data.put("category", block.category());
      data.put("status", block.status().name());
      data.put("startAt", block.startAt().toString());
      data.put("endAt", block.endAt().toString());
      data.put("sourceTimeZone", block.sourceTimeZone());
      data.put("durationMinutes", block.durationMinutes());
      data.put("notes", block.notes().orElse(null));
      data.put("projectId", block.projectId().map(UUID::toString).orElse(null));
      data.put("taskId", block.taskId().map(UUID::toString).orElse(null));
      data.put("createdAt", block.createdAt().toString());
      data.put("updatedAt", block.updatedAt().toString());
      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize timeblocks export data", e);
    }
  }
}

package tech.buildwithpartha.lifeos.braindump.application;

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
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemRepository;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

/** Contributes brain dump thoughts and inbox items to user data export archives (LOS-1512). */
@Component
public class BrainDumpExportContributor implements UserDataExportContributor {

  private final BrainDumpItemRepository brainDumpItemRepository;
  private final ObjectMapper objectMapper;

  public BrainDumpExportContributor(BrainDumpItemRepository brainDumpItemRepository) {
    this.brainDumpItemRepository = brainDumpItemRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "braindump.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<BrainDumpItem> items = brainDumpItemRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (BrainDumpItem item : items) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", item.id().toString());
      data.put("content", item.content());
      data.put("status", item.status().name());
      data.put("convertedToType", item.convertedToType().orElse(null));
      data.put("convertedToId", item.convertedToId().map(UUID::toString).orElse(null));
      data.put("convertedAt", item.convertedAt().map(Instant::toString).orElse(null));
      data.put("archivedAt", item.archivedAt().map(Instant::toString).orElse(null));
      data.put("createdAt", item.createdAt().toString());
      data.put("updatedAt", item.updatedAt().toString());
      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize braindump export data", e);
    }
  }
}

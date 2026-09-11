package tech.buildwithpartha.lifeos.audit.application;

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
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityEvent;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityRepository;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

/** Contributes user-visible product activity events to user data export archives (LOS-1512). */
@Component
public class ProductActivityExportContributor implements UserDataExportContributor {

  private final ProductActivityRepository activityRepository;
  private final ObjectMapper objectMapper;

  public ProductActivityExportContributor(ProductActivityRepository activityRepository) {
    this.activityRepository = activityRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "activity.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<ProductActivityEvent> events = activityRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (ProductActivityEvent event : events) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", event.id().toString());
      data.put("eventType", event.eventType().name());
      data.put("subjectType", event.subjectType().name());
      data.put("subjectId", event.subjectId().toString());
      data.put("objectType", event.objectType().name());
      data.put("objectId", event.objectId().toString());
      data.put("occurredAt", event.occurredAt().toString());
      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize activity export data", e);
    }
  }
}

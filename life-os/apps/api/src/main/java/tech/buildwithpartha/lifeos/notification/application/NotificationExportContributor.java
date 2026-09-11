package tech.buildwithpartha.lifeos.notification.application;

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
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationRepository;

/** Contributes user-visible in-app notifications to user data export archives (LOS-1512). */
@Component
public class NotificationExportContributor implements UserDataExportContributor {

  private final NotificationRepository notificationRepository;
  private final ObjectMapper objectMapper;

  public NotificationExportContributor(NotificationRepository notificationRepository) {
    this.notificationRepository = notificationRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "notifications.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Notification> notifications = notificationRepository.findAllByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Notification notification : notifications) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", notification.id().toString());
      data.put("category", notification.category().name());
      data.put("title", notification.title());
      data.put("body", notification.body());
      data.put("targetUrl", notification.targetUrl().orElse(null));
      data.put("readAt", notification.readAt().map(Instant::toString).orElse(null));
      data.put("isClearable", notification.isClearable());
      data.put("createdAt", notification.createdAt().toString());
      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize notifications export data", e);
    }
  }
}

package tech.buildwithpartha.lifeos.attachment.application;

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
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

/** Contributes attachment file metadata to user data export archives (LOS-1512). */
@Component
public class AttachmentMetadataExportContributor implements UserDataExportContributor {

  private final AttachmentRepository attachmentRepository;
  private final ObjectMapper objectMapper;

  public AttachmentMetadataExportContributor(AttachmentRepository attachmentRepository) {
    this.attachmentRepository = attachmentRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "attachments.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Attachment> attachments = attachmentRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Attachment attachment : attachments) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", attachment.getId().toString());
      data.put("entityType", attachment.getEntityType().name());
      data.put("entityId", attachment.getEntityId().toString());
      data.put("fileName", attachment.getFileName());
      data.put("sanitizedFileName", attachment.getSanitizedFileName());
      data.put("contentType", attachment.getContentType());
      data.put("fileSizeBytes", attachment.getFileSizeBytes());
      data.put("status", attachment.getStatus().name());
      data.put("scanResult", attachment.getScanResult());
      data.put("createdAt", attachment.getCreatedAt().toString());
      data.put("updatedAt", attachment.getUpdatedAt().toString());
      data.put(
          "deletedAt",
          attachment.getDeletedAt() != null ? attachment.getDeletedAt().toString() : null);
      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize attachments export data", e);
    }
  }
}

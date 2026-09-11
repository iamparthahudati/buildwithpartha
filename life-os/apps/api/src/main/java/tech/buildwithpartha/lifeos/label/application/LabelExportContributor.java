package tech.buildwithpartha.lifeos.label.application;

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
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;

/** Contributes label definitions to user data export archives (LOS-1512). */
@Component
public class LabelExportContributor implements UserDataExportContributor {

  private final LabelRepository labelRepository;
  private final ObjectMapper objectMapper;

  public LabelExportContributor(LabelRepository labelRepository) {
    this.labelRepository = labelRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "labels.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Label> labels = labelRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Label label : labels) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", label.id().toString());
      data.put("name", label.name());
      data.put("nameNormalized", label.nameNormalized());
      data.put("color", label.color());
      data.put("createdAt", label.createdAt().toString());
      data.put("updatedAt", label.updatedAt().toString());
      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize labels export data", e);
    }
  }
}

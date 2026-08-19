package tech.buildwithpartha.lifeos.auth.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

/**
 * Contributes accepted terms and privacy acknowledgment history to data export archives (LOS-0517).
 */
@Component
public class TermsExportContributor implements UserDataExportContributor {

  private final TermsAcceptanceRepository termsRepository;
  private final ObjectMapper objectMapper;

  public TermsExportContributor(TermsAcceptanceRepository termsRepository) {
    this.termsRepository = termsRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "terms.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<TermsAcceptance> acceptances = termsRepository.findByUserId(userId);
    List<Map<String, Object>> data =
        acceptances.stream()
            .map(
                t -> {
                  Map<String, Object> entry = new LinkedHashMap<>();
                  entry.put("termsVersion", t.termsVersion());
                  entry.put("acceptedAt", t.acceptedAt().toString());
                  return entry;
                })
            .toList();

    try {
      return objectMapper.writeValueAsBytes(data);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize terms export data", e);
    }
  }
}

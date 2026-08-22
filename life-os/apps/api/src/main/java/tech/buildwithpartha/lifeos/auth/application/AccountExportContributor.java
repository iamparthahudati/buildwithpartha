package tech.buildwithpartha.lifeos.auth.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

/** Contributes account identity and localization metadata to data export archives (LOS-0517). */
@Component
public class AccountExportContributor implements UserDataExportContributor {

  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  public AccountExportContributor(UserRepository userRepository) {
    this.userRepository = userRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "account.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new IllegalStateException("User not found for export: " + userId));

    Map<String, Object> data = new LinkedHashMap<>();
    data.put("id", user.id().toString());
    data.put("email", user.email().raw());
    data.put("displayName", user.displayName());
    data.put("timeZone", user.timeZone());
    data.put("locale", user.locale());
    data.put("weekStart", user.weekStart());
    data.put("accountStatus", user.accountStatus().name());
    data.put("verifiedAt", user.verifiedAt().map(Instant::toString).orElse(null));
    data.put("createdAt", user.createdAt().toString());
    data.put("updatedAt", user.updatedAt().toString());

    try {
      return objectMapper.writeValueAsBytes(data);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize account export data", e);
    }
  }
}

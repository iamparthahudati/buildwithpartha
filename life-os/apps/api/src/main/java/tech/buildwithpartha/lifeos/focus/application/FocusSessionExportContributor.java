package tech.buildwithpartha.lifeos.focus.application;

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
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruptionRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;

/** Contributes focus session and interruption history to user data export archives (LOS-1512). */
@Component
public class FocusSessionExportContributor implements UserDataExportContributor {

  private final FocusSessionRepository focusSessionRepository;
  private final FocusSessionInterruptionRepository interruptionRepository;
  private final ObjectMapper objectMapper;

  public FocusSessionExportContributor(
      FocusSessionRepository focusSessionRepository,
      FocusSessionInterruptionRepository interruptionRepository) {
    this.focusSessionRepository = focusSessionRepository;
    this.interruptionRepository = interruptionRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "focus_sessions.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<FocusSession> sessions = focusSessionRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (FocusSession session : sessions) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", session.id().toString());
      data.put("status", session.status().name());
      data.put("phase", session.phase().name());
      data.put("plannedFocusSeconds", session.plannedFocusDuration().toSeconds());
      data.put("plannedBreakSeconds", session.plannedBreakDuration().toSeconds());
      data.put("actualFocusSeconds", session.actualFocusDuration().toSeconds());
      data.put("actualBreakSeconds", session.actualBreakDuration().toSeconds());
      data.put("startedAt", session.startedAt().toString());
      data.put("endedAt", session.endedAt().map(Instant::toString).orElse(null));
      data.put("taskId", session.taskId().map(UUID::toString).orElse(null));
      data.put("timeBlockId", session.timeBlockId().map(UUID::toString).orElse(null));
      data.put("createdAt", session.createdAt().toString());
      data.put("updatedAt", session.updatedAt().toString());

      List<FocusSessionInterruption> interruptions =
          interruptionRepository.findByFocusSessionIdAndUserId(session.id(), userId);
      List<Map<String, Object>> interruptionRecords = new ArrayList<>();
      for (FocusSessionInterruption interruption : interruptions) {
        Map<String, Object> interruptionData = new LinkedHashMap<>();
        interruptionData.put("id", interruption.id().toString());
        interruptionData.put("occurredAt", interruption.occurredAt().toString());
        interruptionData.put("note", interruption.note().orElse(null));
        interruptionData.put("createdAt", interruption.createdAt().toString());
        interruptionRecords.add(interruptionData);
      }
      data.put("interruptions", interruptionRecords);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize focus sessions export data", e);
    }
  }
}

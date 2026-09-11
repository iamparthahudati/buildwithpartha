package tech.buildwithpartha.lifeos.goal.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;

/** Contributes goal, milestone check-in, and link data to user data export archives (LOS-1512). */
@Component
public class GoalExportContributor implements UserDataExportContributor {

  private final GoalRepository goalRepository;
  private final GoalCheckInRepository checkInRepository;
  private final GoalLinkRepository linkRepository;
  private final ObjectMapper objectMapper;

  public GoalExportContributor(
      GoalRepository goalRepository,
      GoalCheckInRepository checkInRepository,
      GoalLinkRepository linkRepository) {
    this.goalRepository = goalRepository;
    this.checkInRepository = checkInRepository;
    this.linkRepository = linkRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "goals.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Goal> goals = goalRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Goal goal : goals) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", goal.id().toString());
      data.put("title", goal.title());
      data.put("description", goal.description().orElse(null));
      data.put("category", goal.category());
      data.put("progressType", goal.progressType().name());
      data.put("targetValue", goal.targetValue().map(Object::toString).orElse(null));
      data.put("currentValue", goal.currentValue().toString());
      data.put("unit", goal.unit().orElse(null));
      data.put("targetDate", goal.targetDate().map(LocalDate::toString).orElse(null));
      data.put("status", goal.status().name());
      data.put("checkInCadence", goal.checkInCadence().name());
      data.put("archived", goal.archived());
      data.put("createdAt", goal.createdAt().toString());
      data.put("updatedAt", goal.updatedAt().toString());

      List<GoalCheckIn> checkIns = checkInRepository.findByGoalIdAndUserId(goal.id(), userId);
      List<Map<String, Object>> checkInRecords = new ArrayList<>();
      for (GoalCheckIn checkIn : checkIns) {
        Map<String, Object> checkInData = new LinkedHashMap<>();
        checkInData.put("id", checkIn.id().toString());
        checkInData.put("value", checkIn.value().toString());
        checkInData.put("note", checkIn.note().orElse(null));
        checkInData.put("recordedAt", checkIn.recordedAt().toString());
        checkInData.put("createdAt", checkIn.createdAt().toString());
        checkInRecords.add(checkInData);
      }
      data.put("checkIns", checkInRecords);

      List<GoalLink> links = linkRepository.findByGoalIdAndUserId(goal.id(), userId);
      List<Map<String, Object>> linkRecords = new ArrayList<>();
      for (GoalLink link : links) {
        Map<String, Object> linkData = new LinkedHashMap<>();
        linkData.put("id", link.id().toString());
        linkData.put("targetType", link.targetType().name());
        linkData.put("targetId", link.targetId().toString());
        linkData.put("createdAt", link.createdAt().toString());
        linkRecords.add(linkData);
      }
      data.put("links", linkRecords);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize goals export data", e);
    }
  }
}

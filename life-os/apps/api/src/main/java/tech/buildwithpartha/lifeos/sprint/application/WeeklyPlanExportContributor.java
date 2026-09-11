package tech.buildwithpartha.lifeos.sprint.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlan;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanCapacity;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanItem;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanOutcome;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanRepository;

/** Contributes weekly planning data to user data export archives (LOS-1512). */
@Component
public class WeeklyPlanExportContributor implements UserDataExportContributor {

  private final WeeklyPlanRepository weeklyPlanRepository;
  private final ObjectMapper objectMapper;

  public WeeklyPlanExportContributor(WeeklyPlanRepository weeklyPlanRepository) {
    this.weeklyPlanRepository = weeklyPlanRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "weekly_plans.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<WeeklyPlan> plans = weeklyPlanRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (WeeklyPlan plan : plans) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", plan.id().toString());
      data.put("weekStartDate", plan.weekStartDate().toString());
      data.put("weekEndDate", plan.weekEndDate().toString());
      data.put("timeZone", plan.timeZone());
      data.put("weekStartDay", plan.weekStartDay());
      data.put("revision", plan.revision());
      data.put("status", plan.status().name());
      data.put("predecessorPlanId", plan.predecessorPlanId().map(UUID::toString).orElse(null));
      data.put("finalizedAt", plan.finalizedAt().map(Instant::toString).orElse(null));
      data.put("createdAt", plan.createdAt().toString());
      data.put("updatedAt", plan.updatedAt().toString());

      List<Map<String, Object>> outcomes = new ArrayList<>();
      for (WeeklyPlanOutcome outcome : plan.outcomes()) {
        Map<String, Object> outcomeData = new LinkedHashMap<>();
        outcomeData.put("id", outcome.id().toString());
        outcomeData.put("title", outcome.title());
        outcomeData.put("position", outcome.position());
        outcomes.add(outcomeData);
      }
      data.put("outcomes", outcomes);

      List<Map<String, Object>> items = new ArrayList<>();
      for (WeeklyPlanItem item : plan.items()) {
        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("id", item.id().toString());
        itemData.put("taskId", item.taskId().toString());
        itemData.put("outcomeId", item.outcomeId().map(UUID::toString).orElse(null));
        itemData.put("plannedDate", item.plannedDate().map(LocalDate::toString).orElse(null));
        itemData.put("plannedMinutes", item.plannedMinutes());
        itemData.put("position", item.position());
        itemData.put("taskTitleSnapshot", item.taskTitleSnapshot());
        itemData.put("taskStatusSnapshot", item.taskStatusSnapshot());
        items.add(itemData);
      }
      data.put("items", items);

      List<Map<String, Object>> capacities = new ArrayList<>();
      for (WeeklyPlanCapacity capacity : plan.capacities()) {
        Map<String, Object> capacityData = new LinkedHashMap<>();
        capacityData.put("localDate", capacity.localDate().toString());
        capacityData.put("availableMinutes", capacity.availableMinutes());
        capacities.add(capacityData);
      }
      data.put("capacities", capacities);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize weekly plans export data", e);
    }
  }
}

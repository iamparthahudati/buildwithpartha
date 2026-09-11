package tech.buildwithpartha.lifeos.habit.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;

/** Contributes habit definitions and daily completions to user data export archives (LOS-1512). */
@Component
public class HabitExportContributor implements UserDataExportContributor {

  private final HabitRepository habitRepository;
  private final HabitEntryRepository habitEntryRepository;
  private final ObjectMapper objectMapper;

  public HabitExportContributor(
      HabitRepository habitRepository, HabitEntryRepository habitEntryRepository) {
    this.habitRepository = habitRepository;
    this.habitEntryRepository = habitEntryRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "habits.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Habit> habits = habitRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Habit habit : habits) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", habit.id().toString());
      data.put("name", habit.name());
      data.put("description", habit.description().orElse(null));
      data.put("cadence", habit.cadence().name());
      data.put("targetCount", habit.targetCount());
      data.put("timeZone", habit.timeZone());
      data.put("color", habit.color().orElse(null));
      data.put("reminderEnabled", habit.reminderEnabled());
      data.put("reminderTime", habit.reminderTime().map(LocalTime::toString).orElse(null));
      data.put("archived", habit.archived());
      data.put("createdAt", habit.createdAt().toString());
      data.put("updatedAt", habit.updatedAt().toString());

      List<HabitEntry> entries = habitEntryRepository.findByHabitId(habit.id());
      List<Map<String, Object>> entryRecords = new ArrayList<>();
      for (HabitEntry entry : entries) {
        Map<String, Object> entryData = new LinkedHashMap<>();
        entryData.put("id", entry.id().toString());
        entryData.put("localDate", entry.localDate().toString());
        entryData.put("completedCount", entry.completedCount());
        entryData.put("createdAt", entry.createdAt().toString());
        entryData.put("updatedAt", entry.updatedAt().toString());
        entryRecords.add(entryData);
      }
      data.put("entries", entryRecords);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize habits export data", e);
    }
  }
}

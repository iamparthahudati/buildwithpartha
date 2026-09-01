package tech.buildwithpartha.lifeos.task.application;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;

/** Command record for updating a recurring task series. */
public record UpdateRecurringTaskSeriesCommand(
    String title,
    Optional<String> description,
    TaskPriority priority,
    Optional<UUID> projectId,
    int estimateMinutes,
    RecurrenceFrequency frequency,
    int intervalValue,
    Optional<String> daysOfWeek,
    Optional<Integer> dayOfMonth,
    RecurrenceEndMode endMode,
    Optional<LocalDate> endDate,
    Optional<Integer> endCount,
    LocalDate startDate,
    String timeZone) {}

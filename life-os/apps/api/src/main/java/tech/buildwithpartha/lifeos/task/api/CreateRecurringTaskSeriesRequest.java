package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEndMode;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceFrequency;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;

/** Request DTO for creating a recurring task series. */
public record CreateRecurringTaskSeriesRequest(
    @NotBlank(message = "title must not be blank") String title,
    String description,
    TaskPriority priority,
    UUID projectId,
    @Min(value = 0, message = "estimateMinutes must not be negative") int estimateMinutes,
    @NotNull(message = "frequency must not be null") RecurrenceFrequency frequency,
    @Min(value = 1, message = "intervalValue must be at least 1") int intervalValue,
    String daysOfWeek,
    Integer dayOfMonth,
    @NotNull(message = "endMode must not be null") RecurrenceEndMode endMode,
    LocalDate endDate,
    Integer endCount,
    @NotNull(message = "startDate must not be null") LocalDate startDate,
    @NotBlank(message = "timeZone must not be blank") String timeZone) {}

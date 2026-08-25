package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public record WeeklyPlanItemInput(
    Optional<UUID> id,
    UUID taskId,
    Optional<UUID> outcomeId,
    Optional<LocalDate> plannedDate,
    int plannedMinutes,
    int position) {}

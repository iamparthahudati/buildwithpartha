package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public record CreateSprintCommand(
    String name,
    Optional<String> goal,
    LocalDate startDate,
    LocalDate endDate,
    int targetCapacityPoints,
    List<SprintTaskInput> tasks) {}

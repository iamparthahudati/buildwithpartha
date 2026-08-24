package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.Optional;

public record UpdateSprintCommand(
    String name,
    Optional<String> goal,
    LocalDate startDate,
    LocalDate endDate,
    int targetCapacityPoints,
    long version) {}

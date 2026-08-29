package tech.buildwithpartha.lifeos.common.braindump;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public record ConvertToGoalCommand(
    String title,
    Optional<String> description,
    String category,
    String progressType,
    Optional<BigDecimal> targetValue,
    Optional<LocalDate> targetDate,
    String checkInCadence
) {}

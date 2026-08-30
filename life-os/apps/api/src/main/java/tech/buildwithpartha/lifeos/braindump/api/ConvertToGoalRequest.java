package tech.buildwithpartha.lifeos.braindump.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToGoalCommand;

public record ConvertToGoalRequest(
    @NotBlank(message = "REQUIRED") @Size(max = 500, message = "TOO_LONG") String title,
    Optional<String> description,
    @NotBlank(message = "REQUIRED") String category,
    @NotBlank(message = "REQUIRED") String progressType,
    Optional<BigDecimal> targetValue,
    Optional<LocalDate> targetDate,
    @NotBlank(message = "REQUIRED") String checkInCadence,
    long version) {

  public ConvertToGoalRequest {
    if (description == null) {
      description = Optional.empty();
    }
    if (targetValue == null) {
      targetValue = Optional.empty();
    }
    if (targetDate == null) {
      targetDate = Optional.empty();
    }
  }

  public ConvertToGoalCommand toCommand() {
    return new ConvertToGoalCommand(
        title, description, category, progressType, targetValue, targetDate, checkInCadence);
  }
}

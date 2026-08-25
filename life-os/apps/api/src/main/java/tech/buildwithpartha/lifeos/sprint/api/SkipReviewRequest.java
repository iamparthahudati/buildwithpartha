package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

public record SkipReviewRequest(
    @NotNull ReviewType reviewType,
    @NotBlank String periodKey,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @NotBlank String timeZone,
    @NotBlank String reason) {}

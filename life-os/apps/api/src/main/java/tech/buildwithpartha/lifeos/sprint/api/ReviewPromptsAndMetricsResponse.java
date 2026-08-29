package tech.buildwithpartha.lifeos.sprint.api;

import java.time.LocalDate;
import java.util.List;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

public record ReviewPromptsAndMetricsResponse(
    ReviewType reviewType,
    String periodKey,
    LocalDate startDate,
    LocalDate endDate,
    String timeZone,
    List<ReviewPromptResponse> prompts,
    ReviewSnapshotMetricsResponse metrics) {}

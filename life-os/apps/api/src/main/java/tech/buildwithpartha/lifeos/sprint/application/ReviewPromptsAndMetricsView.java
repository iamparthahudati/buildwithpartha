package tech.buildwithpartha.lifeos.sprint.application;

import java.time.LocalDate;
import java.util.List;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewSnapshotMetrics;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

public record ReviewPromptsAndMetricsView(
    ReviewType reviewType,
    String periodKey,
    LocalDate startDate,
    LocalDate endDate,
    String timeZone,
    List<ReviewPrompt> prompts,
    ReviewSnapshotMetrics metrics) {}

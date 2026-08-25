package tech.buildwithpartha.lifeos.common.task;

import java.util.UUID;

/** Safe Task projection retained when a Weekly Plan is finalized. */
public record WeeklyPlanTaskSummary(UUID id, String title, String status, boolean terminal) {}

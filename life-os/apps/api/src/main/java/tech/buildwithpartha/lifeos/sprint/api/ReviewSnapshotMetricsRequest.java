package tech.buildwithpartha.lifeos.sprint.api;

public record ReviewSnapshotMetricsRequest(
    Integer tasksCompletedCount,
    Integer tasksPlannedCount,
    Integer tasksCarriedOverCount,
    Integer tasksCancelledCount,
    Integer tasksOverdueCount,
    Integer plannedFocusMinutes,
    Integer actualFocusMinutes,
    Integer sprintCommittedCount,
    Integer sprintCompletedCount,
    Integer activeProjectCount,
    Integer completedProjectCount,
    Integer stalledProjectCount,
    Integer dailyReviewCompletionCount,
    Boolean hasMissingData,
    String missingDataNotes) {}

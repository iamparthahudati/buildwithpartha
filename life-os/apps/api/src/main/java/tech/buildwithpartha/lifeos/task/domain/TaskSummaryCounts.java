package tech.buildwithpartha.lifeos.task.domain;

/** Holds dashboard summary metrics for tasks. */
public record TaskSummaryCounts(
    long total,
    long toDo,
    long inProgress,
    long blocked,
    long done,
    long cancelled,
    long overdue,
    long mit) {}

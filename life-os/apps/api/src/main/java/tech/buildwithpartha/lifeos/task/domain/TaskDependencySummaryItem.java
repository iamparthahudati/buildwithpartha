package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.util.UUID;

/** Bounded-query projection of a Task shown in a dependency summary. */
public record TaskDependencySummaryItem(
    UUID id, String title, TaskStatus status, TaskPriority priority, Instant dueAt) {}

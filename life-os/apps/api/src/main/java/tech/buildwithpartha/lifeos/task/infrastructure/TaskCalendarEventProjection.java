package tech.buildwithpartha.lifeos.task.infrastructure;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Narrow Task row used by Calendar without loading Subtasks or Labels. */
interface TaskCalendarEventProjection {

  UUID getId();

  String getTitle();

  TaskStatus getStatus();

  Instant getDueAt();

  UUID getProjectId();
}

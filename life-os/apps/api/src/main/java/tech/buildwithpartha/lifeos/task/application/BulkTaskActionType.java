package tech.buildwithpartha.lifeos.task.application;

/** Supported user-visible bulk mutations for selected tasks. */
public enum BulkTaskActionType {
  STATUS,
  PRIORITY,
  PROJECT,
  ADD_LABEL,
  REMOVE_LABEL,
  SCHEDULE,
  CLEAR_SCHEDULE,
  ARCHIVE
}

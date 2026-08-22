package tech.buildwithpartha.lifeos.project.domain;

/** Policy describing how project progress is calculated from its tasks. */
public enum ProgressPolicy {
  /** All active tasks weigh equally. */
  COUNT,

  /** Tasks are weighted by their estimateMinutes (falling back to 1 if not set). */
  WEIGHT
}

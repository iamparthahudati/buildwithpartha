package tech.buildwithpartha.lifeos.task.domain;

/** Specifies the directional type of a dependency relative to the focus task. */
public enum TaskDependencyType {
  /** The target task blocks the focus task (targetTaskId -> taskId). */
  BLOCKER,

  /** The focus task blocks the target task (taskId -> targetTaskId). */
  DEPENDENT
}

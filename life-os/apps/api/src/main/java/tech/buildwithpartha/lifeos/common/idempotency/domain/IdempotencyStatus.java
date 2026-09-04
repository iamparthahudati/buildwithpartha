package tech.buildwithpartha.lifeos.common.idempotency.domain;

/** State of an idempotency execution attempt. */
public enum IdempotencyStatus {
  IN_PROGRESS,
  COMPLETED,
  FAILED
}

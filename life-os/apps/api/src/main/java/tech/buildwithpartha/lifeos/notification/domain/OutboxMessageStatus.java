package tech.buildwithpartha.lifeos.notification.domain;

/** The lifecycle state of an outbox message. */
public enum OutboxMessageStatus {

  /** Not yet sent, or awaiting its next retry attempt. */
  PENDING,

  /** Delivered to the mail transport. Terminal. */
  SENT,

  /** Exhausted its retry budget without a successful delivery. Terminal. */
  DEAD_LETTERED
}

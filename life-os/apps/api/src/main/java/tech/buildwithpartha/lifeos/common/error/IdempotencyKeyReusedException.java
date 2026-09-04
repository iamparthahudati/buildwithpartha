package tech.buildwithpartha.lifeos.common.error;

/** Exception thrown when an idempotency key is reused for a different operation. */
public final class IdempotencyKeyReusedException extends CodedException {

  public IdempotencyKeyReusedException(String message) {
    super(StandardErrorCodes.IDEMPOTENCY_KEY_REUSED, message);
  }
}

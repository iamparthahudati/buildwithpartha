package tech.buildwithpartha.lifeos.common.error;

/**
 * Exception thrown when an optimistic locking version conflict is detected. Maps to HTTP 409
 * Conflict.
 */
public final class ConcurrencyConflictException extends CodedException {

  public ConcurrencyConflictException(String message) {
    super(StandardErrorCodes.CONCURRENCY_CONFLICT, message);
  }
}

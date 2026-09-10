package tech.buildwithpartha.lifeos.common.error;

/** Thrown when an HTTP precondition (such as an If-Match header check) fails. */
public final class PreconditionFailedException extends CodedException {

  public PreconditionFailedException(String message) {
    super(StandardErrorCodes.PRECONDITION_FAILED, message);
  }
}

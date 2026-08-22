package tech.buildwithpartha.lifeos.common.error;

/**
 * A login attempt rejected for any reason at all — no such account, an account that is not yet
 * {@code ACTIVE}, or a password that does not match. Every one of those cases throws this exact
 * same exception with the same message, deliberately: {@code 06-SECURITY.md}'s "Generic auth
 * recovery responses prevent account enumeration" applies to login the same way it applies to
 * signup and password reset. Always carries {@link StandardErrorCodes#INVALID_CREDENTIALS} and maps
 * to HTTP 401 in {@code ApiExceptionHandler}.
 */
public final class InvalidCredentialsException extends CodedException {

  public InvalidCredentialsException(String message) {
    super(StandardErrorCodes.INVALID_CREDENTIALS, message);
  }
}

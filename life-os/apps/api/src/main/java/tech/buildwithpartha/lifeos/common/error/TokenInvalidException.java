package tech.buildwithpartha.lifeos.common.error;

/**
 * A single-use token (for example an email verification link, LOS-0504) that does not match any
 * issued token. Always carries {@link StandardErrorCodes#TOKEN_INVALID} and maps to HTTP 400 in
 * {@code ApiExceptionHandler}.
 */
public final class TokenInvalidException extends CodedException {

  public TokenInvalidException(String message) {
    super(StandardErrorCodes.TOKEN_INVALID, message);
  }
}

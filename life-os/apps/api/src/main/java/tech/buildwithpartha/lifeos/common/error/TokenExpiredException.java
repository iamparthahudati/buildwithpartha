package tech.buildwithpartha.lifeos.common.error;

/**
 * A single-use token (for example an email verification link, LOS-0504) presented after its expiry.
 * The token is left unconsumed by this failure — an expired token stays distinguishable from an
 * already-used one. Always carries {@link StandardErrorCodes#TOKEN_EXPIRED} and maps to HTTP 400 in
 * {@code ApiExceptionHandler}.
 */
public final class TokenExpiredException extends CodedException {

  public TokenExpiredException(String message) {
    super(StandardErrorCodes.TOKEN_EXPIRED, message);
  }
}

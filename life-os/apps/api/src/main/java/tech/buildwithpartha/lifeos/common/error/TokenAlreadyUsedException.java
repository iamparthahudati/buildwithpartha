package tech.buildwithpartha.lifeos.common.error;

/**
 * A single-use token (for example an email verification link, LOS-0504) that has already been
 * consumed — including the losing side of a race between two concurrent requests presenting the
 * same token, since {@code EmailVerificationTokenRepository#consume} can only let one of them win.
 * Always carries {@link StandardErrorCodes#TOKEN_ALREADY_USED} and maps to HTTP 409 in {@code
 * ApiExceptionHandler}, matching the existing {@code Conflict} shared OpenAPI response.
 */
public final class TokenAlreadyUsedException extends CodedException {

  public TokenAlreadyUsedException(String message) {
    super(StandardErrorCodes.TOKEN_ALREADY_USED, message);
  }
}

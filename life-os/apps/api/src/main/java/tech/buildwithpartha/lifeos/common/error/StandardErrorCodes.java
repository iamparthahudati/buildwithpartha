package tech.buildwithpartha.lifeos.common.error;

/** Stable cross-cutting error codes used before domain-specific error catalogs exist. */
public final class StandardErrorCodes {

  public static final ErrorCode ACCESS_DENIED = ErrorCode.of("ACCESS_DENIED");
  public static final ErrorCode AUTHENTICATION_REQUIRED = ErrorCode.of("AUTHENTICATION_REQUIRED");
  public static final ErrorCode INTERNAL_ERROR = ErrorCode.of("INTERNAL_ERROR");
  public static final ErrorCode INVALID_REQUEST = ErrorCode.of("INVALID_REQUEST");
  public static final ErrorCode RATE_LIMITED = ErrorCode.of("RATE_LIMITED");
  public static final ErrorCode RESOURCE_NOT_FOUND = ErrorCode.of("RESOURCE_NOT_FOUND");
  public static final ErrorCode TOKEN_ALREADY_USED = ErrorCode.of("TOKEN_ALREADY_USED");
  public static final ErrorCode TOKEN_EXPIRED = ErrorCode.of("TOKEN_EXPIRED");
  public static final ErrorCode TOKEN_INVALID = ErrorCode.of("TOKEN_INVALID");
  public static final ErrorCode VALIDATION_FAILED = ErrorCode.of("VALIDATION_FAILED");

  private StandardErrorCodes() {}
}

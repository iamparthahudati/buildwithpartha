package tech.buildwithpartha.lifeos.common.error;

/** Stable cross-cutting error codes used before domain-specific error catalogs exist. */
public final class StandardErrorCodes {

  public static final ErrorCode ACCESS_DENIED = ErrorCode.of("ACCESS_DENIED");
  public static final ErrorCode AUTHENTICATION_REQUIRED = ErrorCode.of("AUTHENTICATION_REQUIRED");
  public static final ErrorCode CSRF_TOKEN_INVALID = ErrorCode.of("CSRF_TOKEN_INVALID");
  public static final ErrorCode INTERNAL_ERROR = ErrorCode.of("INTERNAL_ERROR");
  public static final ErrorCode INVALID_CREDENTIALS = ErrorCode.of("INVALID_CREDENTIALS");
  public static final ErrorCode INVALID_REQUEST = ErrorCode.of("INVALID_REQUEST");
  public static final ErrorCode RATE_LIMITED = ErrorCode.of("RATE_LIMITED");
  public static final ErrorCode RESOURCE_NOT_FOUND = ErrorCode.of("RESOURCE_NOT_FOUND");
  public static final ErrorCode TOKEN_ALREADY_USED = ErrorCode.of("TOKEN_ALREADY_USED");
  public static final ErrorCode TOKEN_EXPIRED = ErrorCode.of("TOKEN_EXPIRED");
  public static final ErrorCode TOKEN_INVALID = ErrorCode.of("TOKEN_INVALID");
  public static final ErrorCode VALIDATION_FAILED = ErrorCode.of("VALIDATION_FAILED");
  public static final ErrorCode CONCURRENCY_CONFLICT = ErrorCode.of("CONCURRENCY_CONFLICT");
  public static final ErrorCode TIME_BLOCK_OVERLAP_CONFLICT =
      ErrorCode.of("TIME_BLOCK_OVERLAP_CONFLICT");
  public static final ErrorCode FOCUS_SESSION_ALREADY_ACTIVE =
      ErrorCode.of("FOCUS_SESSION_ALREADY_ACTIVE");
  public static final ErrorCode FOCUS_SESSION_STATE_CONFLICT =
      ErrorCode.of("FOCUS_SESSION_STATE_CONFLICT");
  public static final ErrorCode IDEMPOTENCY_KEY_REUSED = ErrorCode.of("IDEMPOTENCY_KEY_REUSED");

  private StandardErrorCodes() {}
}

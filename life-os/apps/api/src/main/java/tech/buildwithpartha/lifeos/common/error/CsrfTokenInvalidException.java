package tech.buildwithpartha.lifeos.common.error;

/**
 * A mutating request against an active session that did not present a matching {@code X-CSRF-TOKEN}
 * header (LOS-0506: logout/logout-all are the first endpoints with a real session to protect).
 * Deliberately distinct from {@code AccessDeniedException} — a missing/mismatched CSRF token is not
 * an authorization decision, and folding it into the generic access-denied handler would hide which
 * of the two actually failed. Always carries {@link StandardErrorCodes#CSRF_TOKEN_INVALID} and maps
 * to HTTP 403 in {@code ApiExceptionHandler}.
 */
public final class CsrfTokenInvalidException extends CodedException {

  public CsrfTokenInvalidException(String message) {
    super(StandardErrorCodes.CSRF_TOKEN_INVALID, message);
  }
}

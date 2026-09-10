package tech.buildwithpartha.lifeos.common.concurrency;

import java.util.OptionalLong;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tech.buildwithpartha.lifeos.common.error.PreconditionFailedException;

/** Utilities for ETag formatting, parsing, and If-Match optimistic concurrency validation. */
public final class ETagUtils {

  private ETagUtils() {}

  /** Formats a numeric version into a standard strong ETag header value (e.g. {@code "1"}). */
  public static String formatETag(long version) {
    return "\"" + version + "\"";
  }

  /** Parses a version from an ETag string (e.g. {@code "1"}, {@code W/"1"}, or {@code 1}). */
  public static OptionalLong parseETag(String etag) {
    if (etag == null || etag.isBlank()) {
      return OptionalLong.empty();
    }
    String cleaned = etag.trim();
    if (cleaned.startsWith("W/") || cleaned.startsWith("w/")) {
      cleaned = cleaned.substring(2).trim();
    }
    if (cleaned.startsWith("\"") && cleaned.endsWith("\"") && cleaned.length() >= 2) {
      cleaned = cleaned.substring(1, cleaned.length() - 1).trim();
    }
    try {
      return OptionalLong.of(Long.parseLong(cleaned));
    } catch (NumberFormatException e) {
      return OptionalLong.empty();
    }
  }

  /**
   * Validates an {@code If-Match} request header against the current aggregate version.
   *
   * @param ifMatchHeader the raw {@code If-Match} header value (may be null or blank)
   * @param currentVersion the current version of the aggregate entity
   * @throws PreconditionFailedException if the header is present, non-wildcard (*), and does not
   *     match currentVersion
   */
  public static void validateIfMatch(String ifMatchHeader, long currentVersion) {
    if (ifMatchHeader == null || ifMatchHeader.isBlank()) {
      return;
    }
    String trimmed = ifMatchHeader.trim();
    if ("*".equals(trimmed)) {
      return;
    }
    OptionalLong expectedVersion = parseETag(trimmed);
    if (expectedVersion.isEmpty()) {
      throw new PreconditionFailedException("Malformed If-Match header value: " + ifMatchHeader);
    }
    if (expectedVersion.getAsLong() != currentVersion) {
      throw new PreconditionFailedException(
          "If-Match precondition failed: expected version "
              + currentVersion
              + " but received "
              + expectedVersion.getAsLong());
    }
  }

  /** Wraps a body into a 200 OK {@link ResponseEntity} with an {@code ETag} header. */
  public static <T> ResponseEntity<T> withETag(T body, long version) {
    return withETag(body, version, HttpStatus.OK);
  }

  /** Wraps a body into a {@link ResponseEntity} with status and an {@code ETag} header. */
  public static <T> ResponseEntity<T> withETag(T body, long version, HttpStatus status) {
    return ResponseEntity.status(status).header(HttpHeaders.ETAG, formatETag(version)).body(body);
  }
}

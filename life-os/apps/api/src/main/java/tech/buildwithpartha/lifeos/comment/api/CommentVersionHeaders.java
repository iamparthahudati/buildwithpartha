package tech.buildwithpartha.lifeos.comment.api;

import java.util.List;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

/** Parses the Comment delete {@code If-Match} version without exposing parser failures. */
final class CommentVersionHeaders {

  private CommentVersionHeaders() {}

  static long parse(String value) {
    if (value == null || value.isBlank()) {
      throw invalid("REQUIRED");
    }
    String normalized = value.strip();
    if (normalized.length() >= 2
        && normalized.charAt(0) == '"'
        && normalized.charAt(normalized.length() - 1) == '"') {
      normalized = normalized.substring(1, normalized.length() - 1);
    }
    try {
      long version = Long.parseLong(normalized);
      if (version < 0) {
        throw invalid("POSITIVE_OR_ZERO");
      }
      return version;
    } catch (NumberFormatException exception) {
      throw invalid("INVALID");
    }
  }

  private static FieldValidationException invalid(String code) {
    return new FieldValidationException(
        "Invalid If-Match header", List.of(new FieldProblem("If-Match", code)));
  }
}

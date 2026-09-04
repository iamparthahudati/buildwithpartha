package tech.buildwithpartha.lifeos.common.cache;

/** Utility methods for formatting and matching HTTP ETag headers. */
public final class ETagUtils {

  private ETagUtils() {
    // Utility class
  }

  /**
   * Formats a string or version number into a strong ETag header value.
   *
   * @param value raw version or hash value
   * @return quoted ETag header string
   */
  public static String formatETag(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String trimmed = value.trim();
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
      return trimmed;
    }
    return "\"" + trimmed + "\"";
  }

  /**
   * Formats a version or hash into a weak ETag header value.
   *
   * @param value raw version or hash value
   * @return weak ETag header string (e.g. W/"1")
   */
  public static String formatWeakETag(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String trimmed = value.trim();
    if (trimmed.startsWith("W/\"") && trimmed.endsWith("\"")) {
      return trimmed;
    }
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
      return "W/" + trimmed;
    }
    return "W/\"" + trimmed + "\"";
  }

  /**
   * Evaluates whether an incoming If-None-Match header matches a current ETag.
   *
   * @param ifNoneMatch value of the If-None-Match header
   * @param currentETag current resource ETag
   * @return true if matching
   */
  public static boolean matches(String ifNoneMatch, String currentETag) {
    if (ifNoneMatch == null || currentETag == null) {
      return false;
    }
    String trimmedHeader = ifNoneMatch.trim();
    String trimmedCurrent = currentETag.trim();

    if ("*".equals(trimmedHeader)) {
      return true;
    }

    String[] candidateEtags = trimmedHeader.split(",");
    for (String candidate : candidateEtags) {
      String cleanCandidate = candidate.trim();
      if (cleanCandidate.equals(trimmedCurrent)) {
        return true;
      }
      // Compare without weak prefix W/
      String unweakCandidate =
          cleanCandidate.startsWith("W/") ? cleanCandidate.substring(2) : cleanCandidate;
      String unweakCurrent =
          trimmedCurrent.startsWith("W/") ? trimmedCurrent.substring(2) : trimmedCurrent;
      if (unweakCandidate.equals(unweakCurrent)) {
        return true;
      }
    }

    return false;
  }
}

package tech.buildwithpartha.lifeos.search.domain;

import java.util.Locale;

/** Safe HTML escaping and highlight snippet builder for search results (LOS-1301). */
public final class SearchHighlighter {

  private static final int DEFAULT_SNIPPET_MAX_LENGTH = 160;

  private SearchHighlighter() {}

  public static String escapeHtml(String text) {
    if (text == null || text.isEmpty()) {
      return "";
    }
    return text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }

  public static String highlight(String text, String query) {
    if (text == null || text.isBlank()) {
      return "";
    }
    String escaped = escapeHtml(text);
    if (query == null || query.isBlank()) {
      return escaped;
    }

    String lowerText = escaped.toLowerCase(Locale.ROOT);
    String lowerQuery = escapeHtml(query).toLowerCase(Locale.ROOT);
    int index = lowerText.indexOf(lowerQuery);

    if (index < 0) {
      return escaped;
    }

    StringBuilder builder = new StringBuilder();
    int lastEnd = 0;
    while (index >= 0) {
      builder.append(escaped, lastEnd, index);
      builder.append("<mark>");
      builder.append(escaped, index, index + lowerQuery.length());
      builder.append("</mark>");
      lastEnd = index + lowerQuery.length();
      index = lowerText.indexOf(lowerQuery, lastEnd);
    }
    builder.append(escaped.substring(lastEnd));
    return builder.toString();
  }

  public static String extractSnippetAndHighlight(String text, String query) {
    if (text == null || text.isBlank()) {
      return "";
    }
    String normalized = text.trim();
    if (query == null || query.isBlank()) {
      String escaped = escapeHtml(normalized);
      if (escaped.length() <= DEFAULT_SNIPPET_MAX_LENGTH) {
        return escaped;
      }
      return escaped.substring(0, DEFAULT_SNIPPET_MAX_LENGTH) + "...";
    }

    String lowerText = normalized.toLowerCase(Locale.ROOT);
    String lowerQuery = query.toLowerCase(Locale.ROOT);
    int matchIndex = lowerText.indexOf(lowerQuery);

    if (matchIndex < 0) {
      String escaped = escapeHtml(normalized);
      if (escaped.length() <= DEFAULT_SNIPPET_MAX_LENGTH) {
        return escaped;
      }
      return escaped.substring(0, DEFAULT_SNIPPET_MAX_LENGTH) + "...";
    }

    int start = Math.max(0, matchIndex - 50);
    int end = Math.min(normalized.length(), matchIndex + query.length() + 90);

    boolean cutStart = start > 0;
    boolean cutEnd = end < normalized.length();

    String substring = normalized.substring(start, end);
    String highlighted = highlight(substring, query);

    return (cutStart ? "..." : "") + highlighted + (cutEnd ? "..." : "");
  }
}

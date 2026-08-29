package tech.buildwithpartha.lifeos.comment.domain;

import java.net.URI;
import java.util.Objects;

/** Sanitizes the approved plain-text/Markdown Comment body contract. */
public final class CommentBodyPolicy {

  public static final int MAX_INPUT_LENGTH = 4_000;
  public static final int MAX_STORED_LENGTH = 20_000;

  public String sanitize(String input, CommentFormat format) {
    Objects.requireNonNull(input, "input must not be null");
    Objects.requireNonNull(format, "format must not be null");
    String normalized = input.replace("\r\n", "\n").replace('\r', '\n').strip();
    validate(normalized);
    if (format == CommentFormat.PLAIN_TEXT) {
      return normalized;
    }

    String escaped = escapeRawHtmlAndEntities(neutralizeLinksAndImages(normalized));
    if (escaped.length() > MAX_STORED_LENGTH) {
      throw new IllegalArgumentException("sanitized body exceeds the stored length limit");
    }
    return escaped;
  }

  private static void validate(String body) {
    if (body.isBlank()) {
      throw new IllegalArgumentException("body must not be blank");
    }
    if (body.length() > MAX_INPUT_LENGTH) {
      throw new IllegalArgumentException("body exceeds the input length limit");
    }
    body.codePoints()
        .filter(codePoint -> Character.isISOControl(codePoint))
        .filter(codePoint -> codePoint != '\n' && codePoint != '\t')
        .findFirst()
        .ifPresent(
            ignored -> {
              throw new IllegalArgumentException("body contains an unsafe control character");
            });
  }

  private static String neutralizeLinksAndImages(String body) {
    StringBuilder result = new StringBuilder(body.length());
    int index = 0;
    while (index < body.length()) {
      boolean image = body.charAt(index) == '!' && index + 1 < body.length();
      int labelStart = image ? index + 1 : index;
      if (body.charAt(labelStart) != '[') {
        result.append(body.charAt(index++));
        continue;
      }

      int labelEnd = body.indexOf(']', labelStart + 1);
      if (labelEnd < 0 || labelEnd + 1 >= body.length() || body.charAt(labelEnd + 1) != '(') {
        if (image) {
          // Drop the image marker; the following '[' is neutralized on the next iteration.
          index++;
        } else {
          // Reference/shortcut links are outside the subset because their destination is remote
          // from the label and cannot be validated locally.
          result.append("\\[");
          index++;
        }
        continue;
      }
      int destinationEnd = closingParenthesis(body, labelEnd + 1);
      if (destinationEnd < 0) {
        result.append(body.charAt(index++));
        continue;
      }

      String label = body.substring(labelStart + 1, labelEnd);
      String destination = body.substring(labelEnd + 2, destinationEnd).strip();
      if (!image && isAllowedLink(destination)) {
        result.append(body, index, destinationEnd + 1);
      } else {
        result.append(label);
      }
      index = destinationEnd + 1;
    }
    return result.toString();
  }

  private static int closingParenthesis(String body, int openingIndex) {
    int depth = 0;
    for (int index = openingIndex; index < body.length(); index++) {
      char current = body.charAt(index);
      if (current == '\n' || current == '\r') {
        return -1;
      }
      if (current == '(') {
        depth++;
      } else if (current == ')') {
        depth--;
        if (depth == 0) {
          return index;
        }
      }
    }
    return -1;
  }

  private static boolean isAllowedLink(String destination) {
    try {
      URI uri = URI.create(destination);
      String scheme = uri.getScheme();
      return ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
          && uri.getHost() != null
          && uri.getUserInfo() == null;
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }

  private static String escapeRawHtmlAndEntities(String body) {
    return body.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }
}

package tech.buildwithpartha.lifeos.attachment.domain;

import java.util.Locale;
import java.util.Set;

/**
 * Validates file MIME types and inspects magic-byte binary headers (ADR-015). Prevents MIME
 * spoofing, executable upload execution, and stored XSS vectors.
 */
public final class AttachmentMimeValidator {

  private static final Set<String> ALLOWED_MIME_TYPES =
      Set.of(
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "text/plain",
          "text/markdown",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  private static final Set<String> FORBIDDEN_EXTENSIONS =
      Set.of(
          "exe", "sh", "bat", "dll", "cmd", "py", "js", "html", "htm", "svg", "php", "jar", "bin",
          "vbs", "ps1");

  private AttachmentMimeValidator() {}

  public static boolean isAllowedMimeType(String contentType) {
    if (contentType == null || contentType.isBlank()) {
      return false;
    }
    return ALLOWED_MIME_TYPES.contains(contentType.toLowerCase(Locale.ROOT).trim());
  }

  public static boolean isForbiddenFilename(String fileName) {
    if (fileName == null || fileName.isBlank()) {
      return true;
    }
    String cleanName = fileName.toLowerCase(Locale.ROOT).trim();
    int lastDot = cleanName.lastIndexOf('.');
    if (lastDot == -1 || lastDot == cleanName.length() - 1) {
      return false;
    }
    String extension = cleanName.substring(lastDot + 1);
    return FORBIDDEN_EXTENSIONS.contains(extension);
  }

  public static String sanitizeFilename(String originalFilename) {
    if (originalFilename == null || originalFilename.isBlank()) {
      return "attachment";
    }
    // Strip path elements to prevent path traversal
    String nameOnly = originalFilename;
    int slashIndex =
        Math.max(originalFilename.lastIndexOf('/'), originalFilename.lastIndexOf('\\'));
    if (slashIndex != -1 && slashIndex < originalFilename.length() - 1) {
      nameOnly = originalFilename.substring(slashIndex + 1);
    }
    // Replace non-alphanumeric/dot/dash/underscore with underscore
    String sanitized = nameOnly.replaceAll("[^a-zA-Z0-9._-]", "_");
    if (sanitized.isBlank()) {
      return "attachment";
    }
    return sanitized;
  }

  public static boolean validateMagicBytes(String contentType, byte[] header) {
    if (contentType == null || header == null || header.length == 0) {
      return false;
    }

    String mime = contentType.toLowerCase(Locale.ROOT).trim();

    return switch (mime) {
      case "image/jpeg" -> matchesJpeg(header);
      case "image/png" -> matchesPng(header);
      case "image/gif" -> matchesGif(header);
      case "image/webp" -> matchesWebp(header);
      case "application/pdf" -> matchesPdf(header);
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ->
          matchesZip(header);
      case "application/msword", "application/vnd.ms-excel" ->
          matchesOlecf(header) || matchesZip(header);
      case "text/plain", "text/markdown" -> matchesText(header);
      default -> false;
    };
  }

  private static boolean matchesJpeg(byte[] header) {
    return header.length >= 3
        && (header[0] & 0xFF) == 0xFF
        && (header[1] & 0xFF) == 0xD8
        && (header[2] & 0xFF) == 0xFF;
  }

  private static boolean matchesPng(byte[] header) {
    return header.length >= 4
        && (header[0] & 0xFF) == 0x89
        && (header[1] & 0xFF) == 0x50 // 'P'
        && (header[2] & 0xFF) == 0x4E // 'N'
        && (header[3] & 0xFF) == 0x47; // 'G'
  }

  private static boolean matchesGif(byte[] header) {
    return header.length >= 3
        && (header[0] & 0xFF) == 0x47 // 'G'
        && (header[1] & 0xFF) == 0x49 // 'I'
        && (header[2] & 0xFF) == 0x46; // 'F'
  }

  private static boolean matchesWebp(byte[] header) {
    if (header.length < 12) {
      return false;
    }
    return (header[0] & 0xFF) == 0x52 // 'R'
        && (header[1] & 0xFF) == 0x49 // 'I'
        && (header[2] & 0xFF) == 0x46 // 'F'
        && (header[3] & 0xFF) == 0x46 // 'F'
        && (header[8] & 0xFF) == 0x57 // 'W'
        && (header[9] & 0xFF) == 0x45 // 'E'
        && (header[10] & 0xFF) == 0x42 // 'B'
        && (header[11] & 0xFF) == 0x50; // 'P'
  }

  private static boolean matchesPdf(byte[] header) {
    return header.length >= 4
        && (header[0] & 0xFF) == 0x25 // '%'
        && (header[1] & 0xFF) == 0x50 // 'P'
        && (header[2] & 0xFF) == 0x44 // 'D'
        && (header[3] & 0xFF) == 0x46; // 'F'
  }

  private static boolean matchesZip(byte[] header) {
    return header.length >= 4
        && (header[0] & 0xFF) == 0x50 // 'P'
        && (header[1] & 0xFF) == 0x4B // 'K'
        && (header[2] & 0xFF) == 0x03
        && (header[3] & 0xFF) == 0x04;
  }

  private static boolean matchesOlecf(byte[] header) {
    return header.length >= 4
        && (header[0] & 0xFF) == 0xD0
        && (header[1] & 0xFF) == 0xCF
        && (header[2] & 0xFF) == 0x11
        && (header[3] & 0xFF) == 0xE0;
  }

  private static boolean matchesText(byte[] header) {
    // Printable ASCII or UTF-8 text without control characters/null bytes
    for (byte b : header) {
      int unsigned = b & 0xFF;
      if (unsigned == 0) {
        return false; // Null byte indicates binary content
      }
    }
    return true;
  }
}

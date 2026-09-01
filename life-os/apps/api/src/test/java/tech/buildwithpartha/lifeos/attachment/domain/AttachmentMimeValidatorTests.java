package tech.buildwithpartha.lifeos.attachment.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AttachmentMimeValidatorTests {

  @Test
  @DisplayName("isAllowedMimeType allows valid images, documents, and text types")
  void allowsValidMimeTypes() {
    assertThat(AttachmentMimeValidator.isAllowedMimeType("image/jpeg")).isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("image/png")).isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("image/gif")).isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("image/webp")).isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("application/pdf")).isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("text/plain")).isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("text/markdown")).isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("application/msword")).isTrue();
    assertThat(
            AttachmentMimeValidator.isAllowedMimeType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
        .isTrue();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("application/vnd.ms-excel")).isTrue();
    assertThat(
            AttachmentMimeValidator.isAllowedMimeType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .isTrue();
  }

  @Test
  @DisplayName("isAllowedMimeType rejects executables, HTML, SVG, and octet-stream")
  void rejectsForbiddenMimeTypes() {
    assertThat(AttachmentMimeValidator.isAllowedMimeType("text/html")).isFalse();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("image/svg+xml")).isFalse();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("application/octet-stream")).isFalse();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("application/x-msdownload")).isFalse();
    assertThat(AttachmentMimeValidator.isAllowedMimeType("")).isFalse();
    assertThat(AttachmentMimeValidator.isAllowedMimeType(null)).isFalse();
  }

  @Test
  @DisplayName("isForbiddenFilename identifies dangerous file extensions")
  void identifiesForbiddenExtensions() {
    assertThat(AttachmentMimeValidator.isForbiddenFilename("script.exe")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("hack.sh")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("payload.bat")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("page.html")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("icon.svg")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename(null)).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("nodot")).isFalse();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("dotatend.")).isFalse();

    assertThat(AttachmentMimeValidator.isForbiddenFilename("report.pdf")).isFalse();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("photo.jpg")).isFalse();
  }

  @Test
  @DisplayName("sanitizeFilename strips path elements and illegal characters")
  void sanitizesFilenames() {
    assertThat(AttachmentMimeValidator.sanitizeFilename("../../etc/passwd")).isEqualTo("passwd");
    assertThat(AttachmentMimeValidator.sanitizeFilename("my document (1).pdf"))
        .isEqualTo("my_document__1_.pdf");
    assertThat(AttachmentMimeValidator.sanitizeFilename("   ")).isEqualTo("attachment");
    assertThat(AttachmentMimeValidator.sanitizeFilename("")).isEqualTo("attachment");
    assertThat(AttachmentMimeValidator.sanitizeFilename(null)).isEqualTo("attachment");
    assertThat(AttachmentMimeValidator.sanitizeFilename("path/to/folder/"))
        .isEqualTo("path_to_folder_");
  }

  @Test
  @DisplayName("validateMagicBytes validates headers for all supported MIME types")
  void validatesMagicBytesAllTypes() {
    assertThat(AttachmentMimeValidator.validateMagicBytes(null, new byte[] {0x00})).isFalse();
    assertThat(AttachmentMimeValidator.validateMagicBytes("image/jpeg", null)).isFalse();
    assertThat(AttachmentMimeValidator.validateMagicBytes("image/jpeg", new byte[0])).isFalse();

    byte[] jpegHeader = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};
    assertThat(AttachmentMimeValidator.validateMagicBytes("image/jpeg", jpegHeader)).isTrue();

    byte[] pngHeader = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47};
    assertThat(AttachmentMimeValidator.validateMagicBytes("image/png", pngHeader)).isTrue();

    byte[] gifHeader = new byte[] {0x47, 0x49, 0x46, 0x38, 0x39, 0x61};
    assertThat(AttachmentMimeValidator.validateMagicBytes("image/gif", gifHeader)).isTrue();

    byte[] webpHeader =
        new byte[] {
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
        }; // RIFF....WEBP
    assertThat(AttachmentMimeValidator.validateMagicBytes("image/webp", webpHeader)).isTrue();
    assertThat(
            AttachmentMimeValidator.validateMagicBytes(
                "image/webp", new byte[] {0x52, 0x49, 0x46, 0x46}))
        .isFalse();

    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};
    assertThat(AttachmentMimeValidator.validateMagicBytes("application/pdf", pdfHeader)).isTrue();

    byte[] zipHeader = new byte[] {0x50, 0x4B, 0x03, 0x04};
    assertThat(
            AttachmentMimeValidator.validateMagicBytes(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                zipHeader))
        .isTrue();

    byte[] olecfHeader = new byte[] {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0};
    assertThat(AttachmentMimeValidator.validateMagicBytes("application/msword", olecfHeader))
        .isTrue();

    byte[] textHeader = "Hello text content".getBytes();
    assertThat(AttachmentMimeValidator.validateMagicBytes("text/plain", textHeader)).isTrue();
    byte[] nullByteText = new byte[] {'H', 'e', 0x00, 'o'};
    assertThat(AttachmentMimeValidator.validateMagicBytes("text/plain", nullByteText)).isFalse();

    assertThat(AttachmentMimeValidator.validateMagicBytes("unknown/type", textHeader)).isFalse();
  }
}

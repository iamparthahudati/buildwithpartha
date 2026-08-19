package tech.buildwithpartha.lifeos.export.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;

class ExportFileTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final Instant EXPIRES_AT = NOW.plusSeconds(86400 * 7);
  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID EXPORT_ID = UUID.randomUUID();

  private static ExportFile createGenerating() {
    return ExportFile.createGenerating(
        EXPORT_ID,
        USER_ID,
        Optional.empty(),
        ExportFileKind.FULL_DATA_EXPORT,
        "lifeos-export.zip",
        EXPIRES_AT,
        NOW);
  }

  @Test
  void createGenerating_initializesCorrectDefaults() {
    ExportFile file = createGenerating();
    assertThat(file.id()).isEqualTo(EXPORT_ID);
    assertThat(file.userId()).isEqualTo(USER_ID);
    assertThat(file.status()).isEqualTo(ExportFileStatus.GENERATING);
    assertThat(file.fileSizeBytes()).isEmpty();
    assertThat(file.downloadTokenHash()).isEmpty();
    assertThat(file.downloadTokenExpiresAt()).isEmpty();
    assertThat(file.downloadedAt()).isEmpty();
    assertThat(file.isActive()).isTrue();
  }

  @Test
  void markReady_setsSizeAndTokenHash() {
    Instant tokenExpiry = NOW.plusSeconds(1800);
    ExportFile ready = createGenerating().markReady(1024L, "token-hash-123", tokenExpiry, NOW);

    assertThat(ready.status()).isEqualTo(ExportFileStatus.READY);
    assertThat(ready.fileSizeBytes()).contains(1024L);
    assertThat(ready.downloadTokenHash()).contains("token-hash-123");
    assertThat(ready.downloadTokenExpiresAt()).contains(tokenExpiry);
    assertThat(ready.isActive()).isTrue();
  }

  @Test
  void withNewDownloadToken_updatesTokenHashAndExpiry() {
    Instant tokenExpiry1 = NOW.plusSeconds(1800);
    Instant tokenExpiry2 = NOW.plusSeconds(3600);
    ExportFile ready = createGenerating().markReady(1024L, "hash-1", tokenExpiry1, NOW);
    ExportFile updated = ready.withNewDownloadToken("hash-2", tokenExpiry2, NOW);

    assertThat(updated.downloadTokenHash()).contains("hash-2");
    assertThat(updated.downloadTokenExpiresAt()).contains(tokenExpiry2);
  }

  @Test
  void recordDownload_recordsDownloadTimestamp() {
    Instant tokenExpiry = NOW.plusSeconds(1800);
    Instant downloadedAt = NOW.plusSeconds(120);
    ExportFile ready = createGenerating().markReady(1024L, "hash-1", tokenExpiry, NOW);
    ExportFile downloaded = ready.recordDownload(downloadedAt);

    assertThat(downloaded.downloadedAt()).contains(downloadedAt);
  }

  @Test
  void markExpired_transitionsStatusAndClearsToken() {
    Instant tokenExpiry = NOW.plusSeconds(1800);
    ExportFile ready = createGenerating().markReady(1024L, "hash-1", tokenExpiry, NOW);
    ExportFile expired = ready.markExpired(NOW.plusSeconds(86400 * 8));

    assertThat(expired.status()).isEqualTo(ExportFileStatus.EXPIRED);
    assertThat(expired.downloadTokenHash()).isEmpty();
    assertThat(expired.downloadTokenExpiresAt()).isEmpty();
    assertThat(expired.isActive()).isFalse();
  }

  @Test
  void markDeleted_transitionsStatusAndClearsToken() {
    Instant tokenExpiry = NOW.plusSeconds(1800);
    ExportFile ready = createGenerating().markReady(1024L, "hash-1", tokenExpiry, NOW);
    ExportFile deleted = ready.markDeleted(NOW.plusSeconds(60));

    assertThat(deleted.status()).isEqualTo(ExportFileStatus.DELETED);
    assertThat(deleted.downloadTokenHash()).isEmpty();
    assertThat(deleted.isActive()).isFalse();
  }

  @Test
  void isTokenValid_validatesMatchingHashAndUnexpiredToken() {
    Instant tokenExpiry = NOW.plusSeconds(1800);
    ExportFile ready = createGenerating().markReady(1024L, "hash-valid", tokenExpiry, NOW);

    assertThat(ready.isTokenValid("hash-valid", NOW.plusSeconds(60))).isTrue();
    assertThat(ready.isTokenValid("wrong-hash", NOW.plusSeconds(60))).isFalse();
    assertThat(ready.isTokenValid("hash-valid", NOW.plusSeconds(2000))).isFalse();
  }

  @Test
  void isTokenValid_returnsFalseWhenStatusNotReady() {
    ExportFile generating = createGenerating();
    assertThat(generating.isTokenValid("any-hash", NOW)).isFalse();
  }

  @Test
  void rejectsNegativeFileSize() {
    assertThatThrownBy(
            () ->
                new ExportFile(
                    EXPORT_ID,
                    USER_ID,
                    Optional.empty(),
                    ExportFileKind.FULL_DATA_EXPORT,
                    "file.zip",
                    Optional.of(-1L),
                    ExportFileStatus.READY,
                    Optional.empty(),
                    Optional.empty(),
                    EXPIRES_AT,
                    Optional.empty(),
                    NOW,
                    NOW))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("fileSizeBytes");
  }
}

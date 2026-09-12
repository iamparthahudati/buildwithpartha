package tech.buildwithpartha.lifeos.common.metrics;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Unit tests for BackupStatusMetricsProvider (LOS-1610).
 *
 * <p>Verifies that:
 * <ul>
 *   <li>Gauges are registered for both backup types on bindTo().</li>
 *   <li>A valid backup status JSON returns the correct epoch timestamp.</li>
 *   <li>A missing status file returns 0.0 (safe default — alert fires immediately).</li>
 *   <li>A malformed status file returns 0.0 gracefully (no exception).</li>
 *   <li>A status file missing the last_success_epoch field returns 0.0.</li>
 *   <li>Privacy — backup_type tag values are only "postgres" or "app_files" (no PII).</li>
 * </ul>
 */
class BackupStatusMetricsProviderTests {

  @TempDir
  Path tempDir;

  private MeterRegistry registry;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    registry = new SimpleMeterRegistry();
    objectMapper = new ObjectMapper();
  }

  // --- Metric registration ---

  @Test
  @DisplayName("bindTo registers gauges for both backup types with correct metric name")
  void registersGaugesForBothBackupTypes() {
    String postgresPath = tempDir.resolve("postgres-status.json").toString();
    String appFilesPath = tempDir.resolve("app-files-status.json").toString();

    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider(postgresPath, appFilesPath, objectMapper);
    provider.bindTo(registry);

    Gauge postgresGauge =
        registry
            .find("lifeos.backup.last_success_timestamp_seconds")
            .tag("backup_type", "postgres")
            .gauge();
    Gauge appFilesGauge =
        registry
            .find("lifeos.backup.last_success_timestamp_seconds")
            .tag("backup_type", "app_files")
            .gauge();

    assertThat(postgresGauge).isNotNull();
    assertThat(appFilesGauge).isNotNull();
  }

  // --- Happy path ---

  @Test
  @DisplayName("returns correct epoch timestamp from a valid backup status JSON")
  void returnsCorrectEpochFromValidStatusFile() throws IOException {
    Path statusFile = tempDir.resolve("postgres-status.json");
    Files.writeString(statusFile, "{\"last_success_epoch\": 1757750400, \"status\": \"SUCCESS\"}");

    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider(statusFile.toString(), "/nonexistent", objectMapper);
    provider.bindTo(registry);

    Gauge gauge =
        registry
            .find("lifeos.backup.last_success_timestamp_seconds")
            .tag("backup_type", "postgres")
            .gauge();

    assertThat(gauge).isNotNull();
    assertThat(gauge.value()).isEqualTo(1757750400.0);
  }

  // --- Missing file (safe default) ---

  @Test
  @DisplayName("returns 0.0 when backup status file does not exist (alert fires immediately)")
  void returnsZeroWhenFileDoesNotExist() {
    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider(
            "/nonexistent/postgres-status.json",
            "/nonexistent/app-files-status.json",
            objectMapper);
    provider.bindTo(registry);

    Gauge gauge =
        registry
            .find("lifeos.backup.last_success_timestamp_seconds")
            .tag("backup_type", "postgres")
            .gauge();

    assertThat(gauge).isNotNull();
    assertThat(gauge.value()).isEqualTo(0.0);
  }

  // --- Missing field ---

  @Test
  @DisplayName("returns 0.0 when last_success_epoch field is absent from JSON")
  void returnsZeroWhenFieldMissing() throws IOException {
    Path statusFile = tempDir.resolve("status-missing-field.json");
    Files.writeString(statusFile, "{\"status\": \"FAILURE\", \"error\": \"disk full\"}");

    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider(statusFile.toString(), "/nonexistent", objectMapper);

    double result = provider.readLastSuccessEpoch(statusFile.toString());

    assertThat(result).isEqualTo(0.0);
  }

  // --- Malformed JSON (graceful degradation) ---

  @Test
  @DisplayName("returns 0.0 gracefully when status file contains malformed JSON")
  void returnsZeroOnMalformedJson() throws IOException {
    Path statusFile = tempDir.resolve("malformed-status.json");
    Files.writeString(statusFile, "NOT VALID JSON }{");

    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider(statusFile.toString(), "/nonexistent", objectMapper);

    double result = provider.readLastSuccessEpoch(statusFile.toString());

    assertThat(result).isEqualTo(0.0);
  }

  // --- Privacy assertion ---

  @Test
  @DisplayName("backup_type tag contains only safe low-cardinality values — no PII")
  void backupTypeTagsArePrivacySafe() {
    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider("/nonexistent", "/nonexistent", objectMapper);
    provider.bindTo(registry);

    // Collect all backup_type tag values — must only be "postgres" or "app_files"
    registry
        .find("lifeos.backup.last_success_timestamp_seconds")
        .meters()
        .forEach(meter -> {
          String backupType = meter.getId().getTag("backup_type");
          assertThat(backupType)
              .as("backup_type tag must be low-cardinality and PII-free")
              .isIn("postgres", "app_files");
        });
  }

  // --- readLastSuccessEpoch directly (unit) ---

  @Test
  @DisplayName("readLastSuccessEpoch returns correct epoch from status file with float value")
  void readLastSuccessEpochParsesFloatEpoch() throws IOException {
    Path statusFile = tempDir.resolve("float-epoch.json");
    Files.writeString(statusFile, "{\"last_success_epoch\": 1757750400.5}");

    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider(statusFile.toString(), "/nonexistent", objectMapper);

    double result = provider.readLastSuccessEpoch(statusFile.toString());

    assertThat(result).isEqualTo(1757750400.5);
  }

  @Test
  @DisplayName("readLastSuccessEpoch returns 0.0 for a path pointing to a directory not a file")
  void readLastSuccessEpochReturnZeroForDirectory() {
    BackupStatusMetricsProvider provider =
        new BackupStatusMetricsProvider(tempDir.toString(), "/nonexistent", objectMapper);

    // tempDir is a directory, not a file — should degrade gracefully
    double result = provider.readLastSuccessEpoch(tempDir.toString());

    assertThat(result).isEqualTo(0.0);
  }
}

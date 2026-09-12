package tech.buildwithpartha.lifeos.common.metrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;
import java.io.File;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

/**
 * Micrometer MeterBinder that exposes backup age metrics to the Prometheus /actuator/prometheus
 * endpoint. Reads last-success epoch timestamps from the backup status JSON files written by
 * backup-postgres.sh and backup-app-files.sh.
 *
 * <p>Metric: {@code lifeos.backup.last_success_timestamp_seconds} with tag {@code backup_type}
 * ({@code postgres} or {@code app_files}).
 *
 * <p>Prometheus alert rule {@code BackupAgeExceeded} in
 * life-os/infra/monitoring/prometheus/rules/jobs.yml fires when the time since last success
 * exceeds 26 hours (specification: docs/58-MONITORING-AND-ALERTING.md §6.5).
 *
 * <p>Privacy: backup status files contain only timestamps and result codes — no user data,
 * credentials, or PII enter the metric stream.
 *
 * <p>LOS-1610
 */
@Component
public class BackupStatusMetricsProvider implements MeterBinder {

  private static final Logger log = LoggerFactory.getLogger(BackupStatusMetricsProvider.class);

  private static final String METRIC_NAME = "lifeos.backup.last_success_timestamp_seconds";
  private static final String METRIC_DESCRIPTION =
      "Unix epoch timestamp (seconds) of the last successful backup execution. "
          + "Used by the BackupAgeExceeded alert rule.";

  private static final String FIELD_LAST_SUCCESS_EPOCH = "last_success_epoch";

  private final String postgresBackupStatusPath;
  private final String appFilesBackupStatusPath;
  private final ObjectMapper objectMapper;

  @org.springframework.beans.factory.annotation.Autowired
  public BackupStatusMetricsProvider(
      @Value("${lifeos.monitoring.backup.postgres-status-path:"
          + "/var/log/life-os/postgres-backup-status.json}") String postgresBackupStatusPath,
      @Value("${lifeos.monitoring.backup.app-files-status-path:"
          + "/var/log/life-os/app-files-backup-status.json}") String appFilesBackupStatusPath) {
    this(postgresBackupStatusPath, appFilesBackupStatusPath, new ObjectMapper());
  }

  public BackupStatusMetricsProvider(
      String postgresBackupStatusPath,
      String appFilesBackupStatusPath,
      ObjectMapper objectMapper) {
    this.postgresBackupStatusPath = postgresBackupStatusPath;
    this.appFilesBackupStatusPath = appFilesBackupStatusPath;
    this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
  }

  @Override
  public void bindTo(@NonNull MeterRegistry registry) {
    // PostgreSQL backup last-success timestamp gauge
    Gauge.builder(METRIC_NAME, this, provider -> provider.readLastSuccessEpoch(postgresBackupStatusPath))
        .description(METRIC_DESCRIPTION)
        .tag("backup_type", "postgres")
        .baseUnit("seconds")
        .register(registry);

    // Application files backup last-success timestamp gauge
    Gauge.builder(METRIC_NAME, this, provider -> provider.readLastSuccessEpoch(appFilesBackupStatusPath))
        .description(METRIC_DESCRIPTION)
        .tag("backup_type", "app_files")
        .baseUnit("seconds")
        .register(registry);
  }

  /**
   * Reads the {@code last_success_epoch} field from the given backup status JSON file.
   *
   * <p>Returns {@code 0.0} if the file does not exist (no successful backup recorded yet) or if
   * the field cannot be read. This causes the Prometheus alert to fire immediately when no backup
   * file exists — the safest possible default.
   */
  double readLastSuccessEpoch(String statusFilePath) {
    File statusFile = new File(statusFilePath);
    if (!statusFile.exists() || !statusFile.isFile()) {
      log.debug("Backup status file not found, returning 0 epoch: {}", statusFilePath);
      return 0.0;
    }
    try {
      JsonNode root = objectMapper.readTree(statusFile);
      JsonNode epochNode = root.get(FIELD_LAST_SUCCESS_EPOCH);
      if (epochNode == null || epochNode.isNull()) {
        log.warn("Backup status file missing '{}' field: {}", FIELD_LAST_SUCCESS_EPOCH, statusFilePath);
        return 0.0;
      }
      return epochNode.asDouble();
    } catch (IOException e) {
      // Log at debug to avoid log noise on environments without backup infrastructure
      log.debug("Could not read backup status file {}: {}", statusFilePath, e.getMessage());
      return 0.0;
    }
  }
}

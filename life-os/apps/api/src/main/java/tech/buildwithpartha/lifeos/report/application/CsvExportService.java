package tech.buildwithpartha.lifeos.report.application;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Generates RFC 4180-compliant CSV content from named report data (LOS-1111).
 *
 * <p>Applies formula-injection protection by prefixing cells starting with {@code =}, {@code +},
 * {@code -}, or {@code @} with a single-quote. Includes a metadata header block with report name,
 * date range, timezone, and metric dictionary version. All output uses UTF-8 with BOM to maximize
 * spreadsheet compatibility.
 */
@Service
public class CsvExportService {

  /** UTF-8 BOM bytes for Microsoft Excel / spreadsheet auto-detection. */
  private static final byte[] UTF8_BOM = new byte[] {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

  /** RFC 4180 line terminator. */
  private static final String CRLF = "\r\n";

  /** Characters at the start of a cell that indicate a potential spreadsheet formula. */
  private static final String FORMULA_START_CHARS = "=+-@";

  /**
   * Generates a UTF-8 BOM CSV export from all report table sections.
   *
   * <p>Format:
   *
   * <pre>
   * # LifeOS Report: {reportName}
   * # Generated At: {generatedAt}
   * # Period: {startDate} to {endDate}
   * # Timezone: {timeZone}
   * # Metric Dictionary: v{metricDictionaryVersion}
   * # (blank line)
   * -- Summary Metrics --
   * Metric Key,Name,Value,Unit,Status
   * ...metric rows...
   * (blank line)
   * -- {Table Title} --
   * {header columns...}
   * ...data rows...
   * (blank line between tables)
   * </pre>
   *
   * @param result the generated named report result
   * @return input stream of UTF-8 BOM CSV bytes
   */
  public InputStream generateCsv(NamedReportResult result) {
    StringBuilder csv = new StringBuilder();

    // Metadata header block
    csv.append("# LifeOS Report: ").append(escapeCsvValue(result.reportName())).append(CRLF);
    csv.append("# Report Type: ").append(result.reportType().name()).append(CRLF);
    csv.append("# Generated At: ").append(result.generatedAt().toString()).append(CRLF);
    csv.append("# Period: ")
        .append(result.startDate())
        .append(" to ")
        .append(result.endDate())
        .append(CRLF);
    csv.append("# Timezone: ").append(escapeCsvValue(result.timeZone())).append(CRLF);
    csv.append("# Metric Dictionary: v").append(result.metricDictionaryVersion()).append(CRLF);
    if (result.category() != null) {
      csv.append("# Category: ").append(escapeCsvValue(result.category())).append(CRLF);
    }
    csv.append(CRLF);

    // Summary metrics section
    if (result.metrics() != null && !result.metrics().isEmpty()) {
      csv.append("-- Summary Metrics --").append(CRLF);
      csv.append(
              buildCsvRow(List.of("Metric Key", "Name", "Value", "Unit", "Comparison", "Status")))
          .append(CRLF);
      for (ReportMetric m : result.metrics()) {
        csv.append(
                buildCsvRow(
                    List.of(
                        safe(m.key()),
                        safe(m.name()),
                        safe(m.value()),
                        safe(m.unit()),
                        safe(m.comparisonValue()),
                        safe(m.status()))))
            .append(CRLF);
      }
      csv.append(CRLF);
    }

    // Data table sections
    if (result.tables() != null) {
      for (ReportTableData table : result.tables()) {
        csv.append("-- ").append(escapeCsvValue(table.title())).append(" --").append(CRLF);
        if (table.description() != null && !table.description().isBlank()) {
          csv.append("# ").append(table.description()).append(CRLF);
        }
        if (table.headers() != null && !table.headers().isEmpty()) {
          csv.append(buildCsvRow(table.headers())).append(CRLF);
        }
        if (table.rows() != null) {
          for (List<Object> row : table.rows()) {
            csv.append(buildObjectCsvRow(row)).append(CRLF);
          }
        }
        csv.append(CRLF);
      }
    }

    byte[] csvBytes = csv.toString().getBytes(StandardCharsets.UTF_8);
    byte[] output = new byte[UTF8_BOM.length + csvBytes.length];
    System.arraycopy(UTF8_BOM, 0, output, 0, UTF8_BOM.length);
    System.arraycopy(csvBytes, 0, output, UTF8_BOM.length, csvBytes.length);
    return new ByteArrayInputStream(output);
  }

  /**
   * Computes the byte length of the CSV output for storage metadata.
   *
   * @param result the named report result
   * @return byte length as a long
   */
  public long computeCsvByteLength(NamedReportResult result) {
    // Re-generate to compute size; for synchronous small ranges this is fine
    InputStream is = generateCsv(result);
    try {
      return is.available();
    } catch (Exception e) {
      return 0L;
    }
  }

  /**
   * Derives the filename for the CSV export based on report type and date range.
   *
   * @param reportType the named report type string (e.g. TASK_COMPLETION)
   * @param startDate the start date
   * @param endDate the end date
   * @param timeZone the IANA timezone
   * @return canonical filename like {@code lifeos-task-completion-2026-08-01-to-2026-08-27.csv}
   */
  public String buildFileName(
      String reportType, LocalDate startDate, LocalDate endDate, String timeZone) {
    String typePart = reportType.toLowerCase().replace('_', '-');
    ZoneId zone;
    try {
      zone = ZoneId.of(timeZone);
    } catch (Exception e) {
      zone = ZoneId.of("UTC");
    }
    // Use zone short ID for filename if not UTC
    String zonePart = zone.getId().equals("UTC") ? "" : ("-" + zone.getId().replace('/', '-'));
    return "lifeos-" + typePart + "-" + startDate + "-to-" + endDate + zonePart + ".csv";
  }

  // ---------------------------------------------------------------------------
  // RFC 4180 CSV helpers
  // ---------------------------------------------------------------------------

  /** Builds a CSV row from a list of String values. */
  private String buildCsvRow(List<String> values) {
    StringBuilder row = new StringBuilder();
    for (int i = 0; i < values.size(); i++) {
      if (i > 0) {
        row.append(',');
      }
      row.append(escapeCsvValue(values.get(i)));
    }
    return row.toString();
  }

  /** Builds a CSV row from a list of Object values (converts to string first). */
  private String buildObjectCsvRow(List<Object> values) {
    StringBuilder row = new StringBuilder();
    for (int i = 0; i < values.size(); i++) {
      if (i > 0) {
        row.append(',');
      }
      row.append(escapeCsvValue(values.get(i) != null ? values.get(i).toString() : ""));
    }
    return row.toString();
  }

  /**
   * Escapes a CSV field value per RFC 4180 and applies formula-injection protection.
   *
   * <ul>
   *   <li>Cells beginning with {@code =}, {@code +}, {@code -}, or {@code @} are prefixed with
   *       {@code '} to neutralize spreadsheet formula execution.
   *   <li>Values containing double-quotes, commas, or CRLF/LF are wrapped in double-quotes, and
   *       embedded double-quotes are doubled ({@code ""}).
   * </ul>
   */
  String escapeCsvValue(String value) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    // Formula-injection protection: prefix with single-quote
    String sanitized = value;
    if (!sanitized.isEmpty() && FORMULA_START_CHARS.indexOf(sanitized.charAt(0)) >= 0) {
      sanitized = "'" + sanitized;
    }
    // Determine if quoting is needed
    boolean needsQuoting =
        sanitized.contains("\"")
            || sanitized.contains(",")
            || sanitized.contains("\r")
            || sanitized.contains("\n");
    if (needsQuoting) {
      sanitized = "\"" + sanitized.replace("\"", "\"\"") + "\"";
    }
    return sanitized;
  }

  /** Returns the string or empty string for null. */
  private static String safe(String value) {
    return value != null ? value : "";
  }
}

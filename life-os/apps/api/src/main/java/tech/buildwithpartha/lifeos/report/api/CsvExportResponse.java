package tech.buildwithpartha.lifeos.report.api;

import java.util.UUID;

/**
 * Response body for a successful CSV export request (LOS-1111).
 *
 * <p>The {@code downloadToken} is a short-lived (15-minute) raw token. The client must redeem it
 * via {@code GET /reports/export/csv/download?token={downloadToken}} within the TTL window. The
 * token is not re-issuable after expiry without generating a new export.
 */
public record CsvExportResponse(
    UUID exportId,
    String fileName,
    String downloadToken,
    long tokenTtlMinutes,
    String reportType,
    String startDate,
    String endDate,
    String timeZone) {}

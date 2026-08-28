package tech.buildwithpartha.lifeos.common.export;

import java.io.InputStream;
import java.util.UUID;

/** Cross-domain read model representing a generated file stream payload for download (LOS-1111). */
public record ExportDownloadPayload(
    UUID exportId, String fileName, long fileSizeBytes, InputStream contentStream) {}

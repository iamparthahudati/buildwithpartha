package tech.buildwithpartha.lifeos.attachment.application;

import java.io.InputStream;

/** Outbound port for malware and security scanning integration (ADR-015). */
public interface AttachmentScannerPort {

  ScanResult scanStream(InputStream inputStream);

  record ScanResult(boolean clean, String details) {}
}

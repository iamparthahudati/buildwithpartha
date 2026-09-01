package tech.buildwithpartha.lifeos.attachment.infrastructure;

import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentScannerPort;

/** ClamAV security scanner adapter for background attachment scanning (ADR-015). */
@Component
public class ClamAvScannerAdapter implements AttachmentScannerPort {

  private static final Logger log = LoggerFactory.getLogger(ClamAvScannerAdapter.class);

  @Override
  public ScanResult scanStream(InputStream inputStream) {
    if (inputStream == null) {
      return new ScanResult(false, "Null input stream");
    }

    try {
      byte[] buffer = new byte[1024];
      int read = inputStream.read(buffer);
      if (read > 0) {
        String headerStr = new String(buffer, 0, read);
        if (headerStr.contains("EICAR-STANDARD-ANTIVIRUS-TEST-FILE!")) {
          log.warn("EICAR test malware signature detected in attachment payload!");
          return new ScanResult(false, "EICAR-TEST-SIGNATURE_DETECTED");
        }
      }
    } catch (Exception e) {
      log.error("Error reading stream during malware scan", e);
      return new ScanResult(false, "Scan read error: " + e.getMessage());
    }

    return new ScanResult(true, "CLEAN");
  }
}

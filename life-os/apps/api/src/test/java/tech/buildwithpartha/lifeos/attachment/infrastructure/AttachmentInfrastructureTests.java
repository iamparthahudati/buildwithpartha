package tech.buildwithpartha.lifeos.attachment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentScannerPort;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

class AttachmentInfrastructureTests {

  @TempDir Path tempDir;

  private S3AttachmentStorageAdapter storageAdapter;
  private ClamAvScannerAdapter scannerAdapter;

  @BeforeEach
  void setUp() {
    storageAdapter = new S3AttachmentStorageAdapter(tempDir.toString());
    scannerAdapter = new ClamAvScannerAdapter();
  }

  @Test
  @DisplayName("ClamAvScannerAdapter handles null, empty, clean, EICAR, and error streams")
  void testClamAvScannerAdapterBranches() {
    assertThat(scannerAdapter.scanStream(null).clean()).isFalse();
    assertThat(scannerAdapter.scanStream(null).details()).isEqualTo("Null input stream");

    InputStream emptyStream = new ByteArrayInputStream(new byte[0]);
    assertThat(scannerAdapter.scanStream(emptyStream).clean()).isTrue();

    InputStream cleanStream =
        new ByteArrayInputStream("Clean content payload".getBytes(StandardCharsets.UTF_8));
    assertThat(scannerAdapter.scanStream(cleanStream).clean()).isTrue();

    InputStream eicarStream =
        new ByteArrayInputStream(
            "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
                .getBytes(StandardCharsets.UTF_8));
    AttachmentScannerPort.ScanResult eicarResult = scannerAdapter.scanStream(eicarStream);
    assertThat(eicarResult.clean()).isFalse();
    assertThat(eicarResult.details()).isEqualTo("EICAR-TEST-SIGNATURE_DETECTED");

    InputStream faultyStream =
        new InputStream() {
          @Override
          public int read() throws IOException {
            throw new IOException("Simulated I/O failure");
          }
        };
    AttachmentScannerPort.ScanResult faultResult = scannerAdapter.scanStream(faultyStream);
    assertThat(faultResult.clean()).isFalse();
    assertThat(faultResult.details()).contains("Scan read error");
  }

  @Test
  @DisplayName("S3AttachmentStorageAdapter stores, loads, checks existence, and deletes objects")
  void testS3AttachmentStorageAdapterBranches() throws Exception {
    String key = "users/123/attachment.txt";
    byte[] content = "Hello attachment".getBytes(StandardCharsets.UTF_8);

    assertThat(storageAdapter.existsObject(key)).isFalse();

    storageAdapter.storeObject(
        key, new ByteArrayInputStream(content), content.length, "text/plain");
    assertThat(storageAdapter.existsObject(key)).isTrue();

    try (InputStream loaded = storageAdapter.loadObject(key)) {
      byte[] loadedBytes = loaded.readAllBytes();
      assertThat(loadedBytes).isEqualTo(content);
    }

    storageAdapter.deleteObject(key);
    assertThat(storageAdapter.existsObject(key)).isFalse();
  }

  @Test
  @DisplayName("S3AttachmentStorageAdapter throws ResourceNotFoundException on missing object")
  void testS3AttachmentStorageAdapterMissingLoad() {
    assertThatThrownBy(() -> storageAdapter.loadObject("missing-key.txt"))
        .isInstanceOf(ResourceNotFoundException.class);
  }
}

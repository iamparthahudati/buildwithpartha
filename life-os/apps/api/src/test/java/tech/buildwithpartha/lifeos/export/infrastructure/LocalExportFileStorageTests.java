package tech.buildwithpartha.lifeos.export.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

class LocalExportFileStorageTests {

  @TempDir
  Path tempDir;

  private LocalExportFileStorage storage;

  @BeforeEach
  void setUp() {
    storage = new LocalExportFileStorage(tempDir.toString());
  }

  @Test
  void storeAndRead_roundTripsFileContent() throws Exception {
    UUID exportId = UUID.randomUUID();
    byte[] content = "test storage content".getBytes(StandardCharsets.UTF_8);

    long written = storage.store(exportId, new ByteArrayInputStream(content));
    assertThat(written).isEqualTo(content.length);
    assertThat(storage.exists(exportId)).isTrue();

    try (InputStream in = storage.read(exportId)) {
      assertThat(in.readAllBytes()).isEqualTo(content);
    }
  }

  @Test
  void delete_removesFileFromStorage() {
    UUID exportId = UUID.randomUUID();
    byte[] content = "to be deleted".getBytes(StandardCharsets.UTF_8);
    storage.store(exportId, new ByteArrayInputStream(content));

    assertThat(storage.exists(exportId)).isTrue();
    boolean deleted = storage.delete(exportId);
    assertThat(deleted).isTrue();
    assertThat(storage.exists(exportId)).isFalse();

    boolean secondDelete = storage.delete(exportId);
    assertThat(secondDelete).isFalse();
  }

  @Test
  void read_missingFile_throwsResourceNotFoundException() {
    UUID exportId = UUID.randomUUID();
    assertThatThrownBy(() -> storage.read(exportId))
        .isInstanceOf(ResourceNotFoundException.class);
  }
}

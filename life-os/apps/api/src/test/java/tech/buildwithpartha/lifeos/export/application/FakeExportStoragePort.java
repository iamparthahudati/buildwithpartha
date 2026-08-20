package tech.buildwithpartha.lifeos.export.application;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

/** In-memory fake storage provider for unit tests. */
final class FakeExportStoragePort implements ExportStoragePort {

  private final Map<UUID, byte[]> storage = new HashMap<>();

  @Override
  public long store(UUID exportFileId, InputStream contentStream) {
    try {
      byte[] bytes = contentStream.readAllBytes();
      storage.put(exportFileId, bytes);
      return bytes.length;
    } catch (IOException e) {
      throw new IllegalStateException("Failed to read test stream", e);
    }
  }

  @Override
  public InputStream read(UUID exportFileId) {
    byte[] bytes = storage.get(exportFileId);
    if (bytes == null) {
      throw new ResourceNotFoundException("Export file not found in storage");
    }
    return new ByteArrayInputStream(bytes);
  }

  @Override
  public boolean delete(UUID exportFileId) {
    return storage.remove(exportFileId) != null;
  }

  @Override
  public boolean exists(UUID exportFileId) {
    return storage.containsKey(exportFileId);
  }

  byte[] getBytes(UUID exportFileId) {
    return storage.get(exportFileId);
  }
}

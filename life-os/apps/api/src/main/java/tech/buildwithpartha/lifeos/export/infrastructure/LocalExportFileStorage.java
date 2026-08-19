package tech.buildwithpartha.lifeos.export.infrastructure;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.export.application.ExportStoragePort;

/**
 * Local filesystem storage provider for private generated export files (LOS-1405).
 *
 * <p>Stores files inside a private local directory outside the webroot using random UUIDs to
 * eliminate predictable URLs (06-SECURITY.md).
 */
@Component
public class LocalExportFileStorage implements ExportStoragePort {

  private final Path storageDirectory;

  public LocalExportFileStorage(
      @Value("${lifeos.export-storage-path:/tmp/lifeos-exports}") String storagePath) {
    this.storageDirectory = Paths.get(storagePath).toAbsolutePath().normalize();
    try {
      Files.createDirectories(this.storageDirectory);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to initialize export storage directory", e);
    }
  }

  Path resolveFilePath(UUID exportFileId) {
    return storageDirectory.resolve(exportFileId.toString() + ".export");
  }

  @Override
  public long store(UUID exportFileId, InputStream contentStream) {
    Path targetFile = resolveFilePath(exportFileId);
    try {
      Files.createDirectories(storageDirectory);
      try (BufferedInputStream in = new BufferedInputStream(contentStream);
          BufferedOutputStream out =
              new BufferedOutputStream(new FileOutputStream(targetFile.toFile()))) {
        byte[] buffer = new byte[8192];
        long totalBytes = 0;
        int read;
        while ((read = in.read(buffer)) != -1) {
          out.write(buffer, 0, read);
          totalBytes += read;
        }
        out.flush();
        return totalBytes;
      }
    } catch (IOException e) {
      throw new IllegalStateException("Failed to write export file to storage", e);
    }
  }

  @Override
  public InputStream read(UUID exportFileId) {
    Path file = resolveFilePath(exportFileId);
    if (!Files.exists(file)) {
      throw new ResourceNotFoundException("Export file not found in storage");
    }
    try {
      return new BufferedInputStream(new FileInputStream(file.toFile()));
    } catch (IOException e) {
      throw new IllegalStateException("Failed to read export file from storage", e);
    }
  }

  @Override
  public boolean delete(UUID exportFileId) {
    Path file = resolveFilePath(exportFileId);
    try {
      return Files.deleteIfExists(file);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to delete export file from storage", e);
    }
  }

  @Override
  public boolean exists(UUID exportFileId) {
    return Files.exists(resolveFilePath(exportFileId));
  }
}

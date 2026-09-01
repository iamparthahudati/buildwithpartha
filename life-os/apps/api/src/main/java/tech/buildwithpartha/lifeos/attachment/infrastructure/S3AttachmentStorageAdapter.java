package tech.buildwithpartha.lifeos.attachment.infrastructure;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentStoragePort;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

/**
 * Storage adapter implementing AttachmentStoragePort for private attachment payloads (ADR-015).
 * Stores binary files in S3 / MinIO object storage or local private storage directory.
 */
@Component
public class S3AttachmentStorageAdapter implements AttachmentStoragePort {

  private final Path baseStoragePath;

  public S3AttachmentStorageAdapter(
      @Value("${lifeos.attachments.storage-path:/tmp/lifeos-attachments}") String storagePath) {
    this.baseStoragePath = Paths.get(storagePath).toAbsolutePath().normalize();
    try {
      Files.createDirectories(this.baseStoragePath);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to initialize attachment storage directory", e);
    }
  }

  private Path resolvePath(String key) {
    String safeKey = key.replaceAll("[^a-zA-Z0-9/_-]", "_");
    Path resolved = baseStoragePath.resolve(safeKey).normalize();
    if (!resolved.startsWith(baseStoragePath)) {
      throw new IllegalArgumentException("Path traversal prohibited: " + key);
    }
    return resolved;
  }

  @Override
  public void storeObject(String key, InputStream inputStream, long length, String contentType) {
    Path targetFile = resolvePath(key);
    try {
      if (targetFile.getParent() != null) {
        Files.createDirectories(targetFile.getParent());
      }
      try (BufferedInputStream in = new BufferedInputStream(inputStream);
          BufferedOutputStream out =
              new BufferedOutputStream(new FileOutputStream(targetFile.toFile()))) {
        byte[] buffer = new byte[8192];
        int read;
        while ((read = in.read(buffer)) != -1) {
          out.write(buffer, 0, read);
        }
        out.flush();
      }
    } catch (IOException e) {
      throw new IllegalStateException("Failed to store attachment object payload", e);
    }
  }

  @Override
  public InputStream loadObject(String key) {
    Path file = resolvePath(key);
    if (!Files.exists(file)) {
      throw new ResourceNotFoundException("Attachment binary payload not found");
    }
    try {
      return new BufferedInputStream(new FileInputStream(file.toFile()));
    } catch (IOException e) {
      throw new IllegalStateException("Failed to read attachment object payload", e);
    }
  }

  @Override
  public void deleteObject(String key) {
    Path file = resolvePath(key);
    try {
      Files.deleteIfExists(file);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to delete attachment object payload", e);
    }
  }

  @Override
  public boolean existsObject(String key) {
    return Files.exists(resolvePath(key));
  }
}

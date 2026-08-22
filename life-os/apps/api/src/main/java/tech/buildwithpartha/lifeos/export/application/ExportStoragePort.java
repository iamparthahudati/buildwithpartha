package tech.buildwithpartha.lifeos.export.application;

import java.io.InputStream;
import java.util.UUID;

/**
 * Storage port for saving, reading, and removing private generated export files on the filesystem.
 */
public interface ExportStoragePort {

  /**
   * Stores the archive file bytes for the given export file id.
   *
   * @param exportFileId the unique export file id
   * @param contentStream the stream containing file bytes
   * @return total bytes written
   */
  long store(UUID exportFileId, InputStream contentStream);

  /**
   * Opens an input stream to read the stored archive file.
   *
   * @param exportFileId the unique export file id
   * @return the input stream to the private file
   */
  InputStream read(UUID exportFileId);

  /**
   * Deletes the physical file from private storage.
   *
   * @param exportFileId the unique export file id
   * @return true if the file existed and was deleted
   */
  boolean delete(UUID exportFileId);

  /** Checks if the physical file exists in private storage. */
  boolean exists(UUID exportFileId);
}

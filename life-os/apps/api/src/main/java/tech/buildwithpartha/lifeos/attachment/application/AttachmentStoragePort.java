package tech.buildwithpartha.lifeos.attachment.application;

import java.io.InputStream;

/** Outbound port for S3-compatible object storage operations (ADR-015). */
public interface AttachmentStoragePort {

  void storeObject(String key, InputStream inputStream, long length, String contentType);

  InputStream loadObject(String key);

  void deleteObject(String key);

  boolean existsObject(String key);
}

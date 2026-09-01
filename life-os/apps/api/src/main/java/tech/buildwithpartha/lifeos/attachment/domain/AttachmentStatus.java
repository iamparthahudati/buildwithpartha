package tech.buildwithpartha.lifeos.attachment.domain;

/** Attachment lifecycle scanning and deletion status (ADR-015). */
public enum AttachmentStatus {
  /** Upload complete; awaiting asynchronous malware scan. Download blocked. */
  PENDING_SCAN,

  /** Scan passed cleanly. Available for private authenticated download. */
  CLEAN,

  /** Scan detected virus or security policy violation. Download forbidden. */
  QUARANTINED,

  /** Attachment metadata soft-deleted and binary object scheduled for purge. */
  DELETED
}

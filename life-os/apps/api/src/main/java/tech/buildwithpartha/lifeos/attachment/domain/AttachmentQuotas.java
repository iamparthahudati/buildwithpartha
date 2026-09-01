package tech.buildwithpartha.lifeos.attachment.domain;

/** Quotas and resource limits binding attachment storage (ADR-015). */
public final class AttachmentQuotas {

  /** Maximum 25 MB (26,214,400 bytes) per uploaded file. */
  public static final long MAX_FILE_SIZE_BYTES = 26_214_400L;

  /** Maximum 2 GB (2,147,483,648 bytes) active attachments per Account. */
  public static final long MAX_ACCOUNT_STORAGE_BYTES = 2_147_483_648L;

  /** Maximum 20 attachments per Task or Project entity. */
  public static final int MAX_PER_ENTITY_ATTACHMENTS = 20;

  private AttachmentQuotas() {}
}

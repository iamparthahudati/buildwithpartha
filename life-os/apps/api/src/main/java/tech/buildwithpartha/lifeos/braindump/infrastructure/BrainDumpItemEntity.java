package tech.buildwithpartha.lifeos.braindump.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemStatus;

@Entity
@Table(name = "brain_dump_items", schema = "public")
class BrainDumpItemEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "content", nullable = false)
  private String content;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private BrainDumpItemStatus status;

  @Column(name = "converted_to_type")
  private String convertedToType;

  @Column(name = "converted_to_id")
  private UUID convertedToId;

  @Column(name = "converted_at")
  private Instant convertedAt;

  @Column(name = "archived_at")
  private Instant archivedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected BrainDumpItemEntity() {}

  BrainDumpItemEntity(
      UUID id,
      UUID userId,
      String content,
      BrainDumpItemStatus status,
      String convertedToType,
      UUID convertedToId,
      Instant convertedAt,
      Instant archivedAt,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.status = status;
    this.convertedToType = convertedToType;
    this.convertedToId = convertedToId;
    this.convertedAt = convertedAt;
    this.archivedAt = archivedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  static BrainDumpItemEntity fromDomain(BrainDumpItem domain) {
    return new BrainDumpItemEntity(
        domain.id(),
        domain.userId(),
        domain.content(),
        domain.status(),
        domain.convertedToType().orElse(null),
        domain.convertedToId().orElse(null),
        domain.convertedAt().orElse(null),
        domain.archivedAt().orElse(null),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  BrainDumpItem toDomain() {
    return new BrainDumpItem(
        id,
        userId,
        content,
        status,
        Optional.ofNullable(convertedToType),
        Optional.ofNullable(convertedToId),
        Optional.ofNullable(convertedAt),
        Optional.ofNullable(archivedAt),
        createdAt,
        updatedAt,
        version);
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getContent() {
    return content;
  }

  public BrainDumpItemStatus getStatus() {
    return status;
  }

  public String getConvertedToType() {
    return convertedToType;
  }

  public UUID getConvertedToId() {
    return convertedToId;
  }

  public Instant getConvertedAt() {
    return convertedAt;
  }

  public Instant getArchivedAt() {
    return archivedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public long getVersion() {
    return version;
  }
}

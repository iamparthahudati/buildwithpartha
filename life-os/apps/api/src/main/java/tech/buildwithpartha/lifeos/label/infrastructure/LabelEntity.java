package tech.buildwithpartha.lifeos.label.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/** JPA entity mapping to {@code public.labels}. */
@Entity
@Table(name = "labels", schema = "public")
class LabelEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "name", nullable = false)
  private String name;

  @Column(name = "name_normalized", nullable = false)
  private String nameNormalized;

  @Column(name = "color")
  private String color;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected LabelEntity() {}

  LabelEntity(
      UUID id,
      UUID userId,
      String name,
      String nameNormalized,
      String color,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.nameNormalized = nameNormalized;
    this.color = color;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  String getName() {
    return name;
  }

  String getNameNormalized() {
    return nameNormalized;
  }

  String getColor() {
    return color;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }

  long getVersion() {
    return version;
  }
}

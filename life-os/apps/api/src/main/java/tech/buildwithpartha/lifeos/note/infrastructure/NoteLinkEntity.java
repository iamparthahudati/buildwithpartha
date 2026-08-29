package tech.buildwithpartha.lifeos.note.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.note.domain.NoteLink;
import tech.buildwithpartha.lifeos.note.domain.NoteLinkTargetType;

/** JPA entity mapping to {@code public.note_links}. */
@Entity
@Table(name = "note_links", schema = "public")
class NoteLinkEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "note_id", nullable = false, updatable = false)
  private UUID noteId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", nullable = false)
  private NoteLinkTargetType targetType;

  @Column(name = "target_id", nullable = false)
  private UUID targetId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected NoteLinkEntity() {}

  NoteLinkEntity(
      UUID id,
      UUID noteId,
      UUID userId,
      NoteLinkTargetType targetType,
      UUID targetId,
      Instant createdAt) {
    this.id = id;
    this.noteId = noteId;
    this.userId = userId;
    this.targetType = targetType;
    this.targetId = targetId;
    this.createdAt = createdAt;
  }

  static NoteLinkEntity fromDomain(NoteLink domain) {
    return new NoteLinkEntity(
        domain.id(),
        domain.noteId(),
        domain.userId(),
        domain.targetType(),
        domain.targetId(),
        domain.createdAt());
  }

  NoteLink toDomain() {
    return new NoteLink(id, noteId, userId, targetType, targetId, createdAt);
  }

  public UUID getId() {
    return id;
  }

  public UUID getNoteId() {
    return noteId;
  }

  public UUID getUserId() {
    return userId;
  }

  public NoteLinkTargetType getTargetType() {
    return targetType;
  }

  public UUID getTargetId() {
    return targetId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

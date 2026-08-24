package tech.buildwithpartha.lifeos.focus.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;

/** JPA mapping for {@code public.focus_session_interruptions}. */
@Entity
@Table(name = "focus_session_interruptions", schema = "public")
class FocusSessionInterruptionEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "focus_session_id", nullable = false, updatable = false)
  private UUID focusSessionId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "occurred_at", nullable = false, updatable = false)
  private Instant occurredAt;

  @Column(name = "note")
  private String note;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected FocusSessionInterruptionEntity() {}

  private FocusSessionInterruptionEntity(FocusSessionInterruption interruption) {
    id = interruption.id();
    focusSessionId = interruption.focusSessionId();
    userId = interruption.userId();
    occurredAt = interruption.occurredAt();
    note = interruption.note().orElse(null);
    createdAt = interruption.createdAt();
    version = interruption.version();
  }

  static FocusSessionInterruptionEntity fromDomain(FocusSessionInterruption interruption) {
    return new FocusSessionInterruptionEntity(interruption);
  }

  FocusSessionInterruption toDomain() {
    return new FocusSessionInterruption(
        id, focusSessionId, userId, occurredAt, Optional.ofNullable(note), createdAt, version);
  }
}

package tech.buildwithpartha.lifeos.habit.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;

@Entity
@Table(name = "habit_entries", schema = "public")
class HabitEntryEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "habit_id", nullable = false, updatable = false)
  private UUID habitId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "local_date", nullable = false, updatable = false)
  private LocalDate localDate;

  @Column(name = "completed_count", nullable = false)
  private int completedCount;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected HabitEntryEntity() {}

  HabitEntryEntity(
      UUID id,
      UUID habitId,
      UUID userId,
      LocalDate localDate,
      int completedCount,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.habitId = habitId;
    this.userId = userId;
    this.localDate = localDate;
    this.completedCount = completedCount;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  static HabitEntryEntity fromDomain(HabitEntry domain) {
    return new HabitEntryEntity(
        domain.id(),
        domain.habitId(),
        domain.userId(),
        domain.localDate(),
        domain.completedCount(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  HabitEntry toDomain() {
    return new HabitEntry(
        id, habitId, userId, localDate, completedCount, createdAt, updatedAt, version);
  }

  public UUID getId() {
    return id;
  }

  public UUID getHabitId() {
    return habitId;
  }
}

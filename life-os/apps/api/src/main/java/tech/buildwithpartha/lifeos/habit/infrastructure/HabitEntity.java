package tech.buildwithpartha.lifeos.habit.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;

@Entity
@Table(name = "habits", schema = "public")
class HabitEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "name", nullable = false)
  private String name;

  @Column(name = "description")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "cadence_type", nullable = false)
  private HabitCadence cadence;

  @Column(name = "target_count", nullable = false)
  private int targetCount;

  @Column(name = "time_zone", nullable = false)
  private String timeZone;

  @Column(name = "color")
  private String color;

  @Column(name = "reminder_enabled", nullable = false)
  private boolean reminderEnabled;

  @Column(name = "reminder_time")
  private LocalTime reminderTime;

  @Column(name = "archived", nullable = false)
  private boolean archived;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected HabitEntity() {}

  HabitEntity(
      UUID id,
      UUID userId,
      String name,
      String description,
      HabitCadence cadence,
      int targetCount,
      String timeZone,
      String color,
      boolean reminderEnabled,
      LocalTime reminderTime,
      boolean archived,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.cadence = cadence;
    this.targetCount = targetCount;
    this.timeZone = timeZone;
    this.color = color;
    this.reminderEnabled = reminderEnabled;
    this.reminderTime = reminderTime;
    this.archived = archived;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  static HabitEntity fromDomain(Habit domain) {
    return new HabitEntity(
        domain.id(),
        domain.userId(),
        domain.name(),
        domain.description().orElse(null),
        domain.cadence(),
        domain.targetCount(),
        domain.timeZone(),
        domain.color().orElse(null),
        domain.reminderEnabled(),
        domain.reminderTime().orElse(null),
        domain.archived(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }

  Habit toDomain() {
    return new Habit(
        id,
        userId,
        name,
        Optional.ofNullable(description),
        cadence,
        targetCount,
        timeZone,
        Optional.ofNullable(color),
        reminderEnabled,
        Optional.ofNullable(reminderTime),
        archived,
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

  public boolean isArchived() {
    return archived;
  }
}

package tech.buildwithpartha.lifeos.habit.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;

@Entity
@Table(name = "habit_pause_periods", schema = "public")
class HabitPausePeriodEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "habit_id", nullable = false, updatable = false)
  private UUID habitId;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;

  @Column(name = "reason")
  private String reason;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected HabitPausePeriodEntity() {}

  HabitPausePeriodEntity(
      UUID id,
      UUID habitId,
      UUID userId,
      LocalDate startDate,
      LocalDate endDate,
      String reason,
      Instant createdAt) {
    this.id = id;
    this.habitId = habitId;
    this.userId = userId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.reason = reason;
    this.createdAt = createdAt;
  }

  static HabitPausePeriodEntity fromDomain(HabitPausePeriod domain) {
    return new HabitPausePeriodEntity(
        domain.id(),
        domain.habitId(),
        domain.userId(),
        domain.startDate(),
        domain.endDate().orElse(null),
        domain.reason().orElse(null),
        domain.createdAt());
  }

  HabitPausePeriod toDomain() {
    return new HabitPausePeriod(
        id,
        habitId,
        userId,
        startDate,
        Optional.ofNullable(endDate),
        Optional.ofNullable(reason),
        createdAt);
  }

  public UUID getId() {
    return id;
  }

  public UUID getHabitId() {
    return habitId;
  }
}

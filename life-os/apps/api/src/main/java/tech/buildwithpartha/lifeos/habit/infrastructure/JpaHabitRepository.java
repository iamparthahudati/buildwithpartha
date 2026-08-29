package tech.buildwithpartha.lifeos.habit.infrastructure;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;

@Repository
public class JpaHabitRepository implements HabitRepository {

  private final HabitJpaRepository jpaRepository;

  public JpaHabitRepository(HabitJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
  }

  @Override
  public Habit save(Habit habit) {
    Objects.requireNonNull(habit, "habit must not be null");
    return jpaRepository.saveAndFlush(HabitEntity.fromDomain(habit)).toDomain();
  }

  @Override
  public Optional<Habit> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(HabitEntity::toDomain);
  }

  @Override
  public Optional<Habit> findByIdAndUserId(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByIdAndUserId(id, userId).map(HabitEntity::toDomain);
  }

  @Override
  public List<Habit> findByUserId(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByUserId(userId).stream().map(HabitEntity::toDomain).toList();
  }

  @Override
  public List<Habit> findByUserIdAndArchived(UUID userId, boolean archived) {
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByUserIdAndArchived(userId, archived).stream()
        .map(HabitEntity::toDomain)
        .toList();
  }

  @Override
  public void delete(Habit habit) {
    Objects.requireNonNull(habit, "habit must not be null");
    jpaRepository.delete(HabitEntity.fromDomain(habit));
  }
}

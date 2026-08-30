package tech.buildwithpartha.lifeos.habit.infrastructure;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriodRepository;

@Repository
public class JpaHabitPausePeriodRepository implements HabitPausePeriodRepository {

  private final HabitPausePeriodJpaRepository jpaRepository;

  public JpaHabitPausePeriodRepository(HabitPausePeriodJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
  }

  @Override
  public HabitPausePeriod save(HabitPausePeriod pausePeriod) {
    Objects.requireNonNull(pausePeriod, "pausePeriod must not be null");
    return jpaRepository.saveAndFlush(HabitPausePeriodEntity.fromDomain(pausePeriod)).toDomain();
  }

  @Override
  public Optional<HabitPausePeriod> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(HabitPausePeriodEntity::toDomain);
  }

  @Override
  public List<HabitPausePeriod> findByHabitId(UUID habitId) {
    Objects.requireNonNull(habitId, "habitId must not be null");
    return jpaRepository.findByHabitId(habitId).stream()
        .map(HabitPausePeriodEntity::toDomain)
        .toList();
  }

  @Override
  public List<HabitPausePeriod> findByHabitIds(Collection<UUID> habitIds) {
    Objects.requireNonNull(habitIds, "habitIds must not be null");
    if (habitIds.isEmpty()) {
      return List.of();
    }
    return jpaRepository.findByHabitIdIn(habitIds).stream()
        .map(HabitPausePeriodEntity::toDomain)
        .toList();
  }

  @Override
  public void delete(HabitPausePeriod pausePeriod) {
    Objects.requireNonNull(pausePeriod, "pausePeriod must not be null");
    jpaRepository.delete(HabitPausePeriodEntity.fromDomain(pausePeriod));
  }
}

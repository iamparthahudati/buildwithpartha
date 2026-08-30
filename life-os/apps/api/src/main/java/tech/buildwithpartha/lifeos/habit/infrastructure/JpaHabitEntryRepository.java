package tech.buildwithpartha.lifeos.habit.infrastructure;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;

@Repository
public class JpaHabitEntryRepository implements HabitEntryRepository {

  private final HabitEntryJpaRepository jpaRepository;

  public JpaHabitEntryRepository(HabitEntryJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
  }

  @Override
  public HabitEntry save(HabitEntry entry) {
    Objects.requireNonNull(entry, "entry must not be null");
    return jpaRepository.saveAndFlush(HabitEntryEntity.fromDomain(entry)).toDomain();
  }

  @Override
  public Optional<HabitEntry> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(HabitEntryEntity::toDomain);
  }

  @Override
  public Optional<HabitEntry> findByHabitIdAndLocalDate(UUID habitId, LocalDate localDate) {
    Objects.requireNonNull(habitId, "habitId must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");
    return jpaRepository
        .findByHabitIdAndLocalDate(habitId, localDate)
        .map(HabitEntryEntity::toDomain);
  }

  @Override
  public List<HabitEntry> findByHabitId(UUID habitId) {
    Objects.requireNonNull(habitId, "habitId must not be null");
    return jpaRepository.findByHabitId(habitId).stream().map(HabitEntryEntity::toDomain).toList();
  }

  @Override
  public List<HabitEntry> findByHabitIds(Collection<UUID> habitIds) {
    Objects.requireNonNull(habitIds, "habitIds must not be null");
    if (habitIds.isEmpty()) {
      return List.of();
    }
    return jpaRepository.findByHabitIdIn(habitIds).stream()
        .map(HabitEntryEntity::toDomain)
        .toList();
  }

  @Override
  public List<HabitEntry> findByHabitIdAndLocalDateBetween(
      UUID habitId, LocalDate from, LocalDate to) {
    Objects.requireNonNull(habitId, "habitId must not be null");
    Objects.requireNonNull(from, "from must not be null");
    Objects.requireNonNull(to, "to must not be null");
    return jpaRepository.findByHabitIdAndLocalDateBetween(habitId, from, to).stream()
        .map(HabitEntryEntity::toDomain)
        .toList();
  }

  @Override
  public void delete(HabitEntry entry) {
    Objects.requireNonNull(entry, "entry must not be null");
    jpaRepository.delete(HabitEntryEntity.fromDomain(entry));
  }
}

package tech.buildwithpartha.lifeos.habit.domain;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HabitEntryRepository {
  HabitEntry save(HabitEntry entry);

  Optional<HabitEntry> findById(UUID id);

  Optional<HabitEntry> findByHabitIdAndLocalDate(UUID habitId, LocalDate localDate);

  List<HabitEntry> findByHabitId(UUID habitId);

  List<HabitEntry> findByHabitIds(Collection<UUID> habitIds);

  List<HabitEntry> findByHabitIdAndLocalDateBetween(UUID habitId, LocalDate from, LocalDate to);

  void delete(HabitEntry entry);
}

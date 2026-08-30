package tech.buildwithpartha.lifeos.habit.infrastructure;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface HabitEntryJpaRepository extends JpaRepository<HabitEntryEntity, UUID> {

  Optional<HabitEntryEntity> findByHabitIdAndLocalDate(UUID habitId, LocalDate localDate);

  List<HabitEntryEntity> findByHabitId(UUID habitId);

  List<HabitEntryEntity> findByHabitIdIn(Collection<UUID> habitIds);

  List<HabitEntryEntity> findByHabitIdAndLocalDateBetween(
      UUID habitId, LocalDate from, LocalDate to);
}

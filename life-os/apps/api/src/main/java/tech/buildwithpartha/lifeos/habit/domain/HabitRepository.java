package tech.buildwithpartha.lifeos.habit.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HabitRepository {
  Habit save(Habit habit);

  Optional<Habit> findById(UUID id);

  Optional<Habit> findByIdAndUserId(UUID id, UUID userId);

  List<Habit> findByUserId(UUID userId);

  List<Habit> findByUserIdAndArchived(UUID userId, boolean archived);

  void delete(Habit habit);
}

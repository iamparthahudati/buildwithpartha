package tech.buildwithpartha.lifeos.habit.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HabitPausePeriodRepository {
  HabitPausePeriod save(HabitPausePeriod pausePeriod);

  Optional<HabitPausePeriod> findById(UUID id);

  List<HabitPausePeriod> findByHabitId(UUID habitId);

  void delete(HabitPausePeriod pausePeriod);
}

package tech.buildwithpartha.lifeos.common.habit;

import java.util.List;
import java.util.UUID;

/** Supplies owner-scoped active Habit state without exposing Habit domain internals. */
public interface HabitTodayProjectionProvider {
  List<HabitTodayProjection> getTodayHabits(UUID userId);
}

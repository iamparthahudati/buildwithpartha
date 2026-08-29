package tech.buildwithpartha.lifeos.habit.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface HabitPausePeriodJpaRepository extends JpaRepository<HabitPausePeriodEntity, UUID> {

  List<HabitPausePeriodEntity> findByHabitId(UUID habitId);
}

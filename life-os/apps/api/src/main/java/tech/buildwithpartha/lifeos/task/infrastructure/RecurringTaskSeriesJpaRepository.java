package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface RecurringTaskSeriesJpaRepository extends JpaRepository<RecurringTaskSeriesEntity, UUID> {

  Optional<RecurringTaskSeriesEntity> findByIdAndUserId(UUID id, UUID userId);

  List<RecurringTaskSeriesEntity> findByUserId(UUID userId);

  List<RecurringTaskSeriesEntity> findByUserIdAndDeletedAtIsNull(UUID userId);
}

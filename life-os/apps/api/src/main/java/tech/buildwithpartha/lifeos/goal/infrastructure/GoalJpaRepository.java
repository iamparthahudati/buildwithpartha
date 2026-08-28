package tech.buildwithpartha.lifeos.goal.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

interface GoalJpaRepository extends JpaRepository<GoalEntity, UUID> {
  Optional<GoalEntity> findByIdAndUserId(UUID id, UUID userId);

  List<GoalEntity> findByUserId(UUID userId);

  List<GoalEntity> findByUserIdAndStatus(UUID userId, GoalStatus status);

  List<GoalEntity> findByUserIdAndCategory(UUID userId, String category);
}

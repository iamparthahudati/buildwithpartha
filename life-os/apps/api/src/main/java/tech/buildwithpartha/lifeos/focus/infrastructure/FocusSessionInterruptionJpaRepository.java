package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface FocusSessionInterruptionJpaRepository
    extends JpaRepository<FocusSessionInterruptionEntity, UUID> {

  Optional<FocusSessionInterruptionEntity> findByIdAndUserId(UUID id, UUID userId);

  List<FocusSessionInterruptionEntity> findByFocusSessionIdAndUserIdOrderByOccurredAtAsc(
      UUID focusSessionId, UUID userId);
}

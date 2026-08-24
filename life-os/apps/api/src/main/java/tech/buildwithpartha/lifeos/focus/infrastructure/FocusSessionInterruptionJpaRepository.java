package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface FocusSessionInterruptionJpaRepository
    extends JpaRepository<FocusSessionInterruptionEntity, UUID> {

  List<FocusSessionInterruptionEntity> findByFocusSessionIdAndUserIdOrderByOccurredAtAsc(
      UUID focusSessionId, UUID userId);
}

package tech.buildwithpartha.lifeos.sprint.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SprintRepository {
  void lockUser(UUID userId);

  Sprint save(Sprint sprint);

  Optional<Sprint> findByIdAndUserId(UUID id, UUID userId);

  List<Sprint> findByUserId(UUID userId);

  boolean hasOverlap(UUID userId, LocalDate startDate, LocalDate endDate, UUID excludeId);

  void delete(Sprint sprint);
}

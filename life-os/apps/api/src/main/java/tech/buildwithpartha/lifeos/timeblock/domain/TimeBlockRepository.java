package tech.buildwithpartha.lifeos.timeblock.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository interface for TimeBlock aggregates. */
public interface TimeBlockRepository {

  TimeBlock save(TimeBlock timeBlock);

  Optional<TimeBlock> findById(UUID id);

  Optional<TimeBlock> findByIdAndUserId(UUID id, UUID userId);

  List<TimeBlock> findByUserId(UUID userId);

  List<TimeBlock> findByUserIdAndRange(UUID userId, Instant rangeStart, Instant rangeEnd);

  List<TimeBlock> findByProjectId(UUID projectId);

  List<TimeBlock> findByTaskId(UUID taskId);

  long countByTaskIdAndUserId(UUID taskId, UUID userId);

  void deleteById(UUID id);
}

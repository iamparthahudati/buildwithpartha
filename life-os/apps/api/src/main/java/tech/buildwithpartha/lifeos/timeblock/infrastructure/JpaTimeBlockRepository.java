package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;

/** JPA adapter implementation of {@link TimeBlockRepository}. */
@Repository
class JpaTimeBlockRepository implements TimeBlockRepository {

  private final TimeBlockJpaRepository jpaRepository;

  JpaTimeBlockRepository(TimeBlockJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public TimeBlock save(TimeBlock timeBlock) {
    TimeBlockEntity entity = TimeBlockEntity.fromDomain(timeBlock);
    TimeBlockEntity saved = jpaRepository.save(entity);
    return saved.toDomain();
  }

  @Override
  public Optional<TimeBlock> findById(UUID id) {
    return jpaRepository.findById(id).map(TimeBlockEntity::toDomain);
  }

  @Override
  public Optional<TimeBlock> findByIdAndUserId(UUID id, UUID userId) {
    return jpaRepository.findByIdAndUserId(id, userId).map(TimeBlockEntity::toDomain);
  }

  @Override
  public List<TimeBlock> findByUserId(UUID userId) {
    return jpaRepository.findByUserIdOrderByStartAtAsc(userId).stream()
        .map(TimeBlockEntity::toDomain)
        .toList();
  }

  @Override
  public List<TimeBlock> findByUserIdAndRange(UUID userId, Instant rangeStart, Instant rangeEnd) {
    return jpaRepository.findByUserIdAndRange(userId, rangeStart, rangeEnd).stream()
        .map(TimeBlockEntity::toDomain)
        .toList();
  }

  @Override
  public List<TimeBlock> findByProjectId(UUID projectId) {
    return jpaRepository.findByProjectIdOrderByStartAtAsc(projectId).stream()
        .map(TimeBlockEntity::toDomain)
        .toList();
  }

  @Override
  public List<TimeBlock> findByTaskId(UUID taskId) {
    return jpaRepository.findByTaskIdOrderByStartAtAsc(taskId).stream()
        .map(TimeBlockEntity::toDomain)
        .toList();
  }

  @Override
  public List<TimeBlock> findByUserIdAndProjectId(UUID userId, UUID projectId) {
    return jpaRepository.findByUserIdAndProjectIdOrderByStartAtAsc(userId, projectId).stream()
        .map(TimeBlockEntity::toDomain)
        .toList();
  }

  @Override
  public List<TimeBlock> findByUserIdAndTaskId(UUID userId, UUID taskId) {
    return jpaRepository.findByUserIdAndTaskIdOrderByStartAtAsc(userId, taskId).stream()
        .map(TimeBlockEntity::toDomain)
        .toList();
  }

  @Override
  public List<TimeBlock> findOverlappingByUserId(
      UUID userId, Instant rangeStart, Instant rangeEnd, UUID excludeId) {
    return jpaRepository.findOverlappingByUserId(userId, rangeStart, rangeEnd, excludeId).stream()
        .map(TimeBlockEntity::toDomain)
        .toList();
  }

  @Override
  public long countByTaskIdAndUserId(UUID taskId, UUID userId) {
    return jpaRepository.countByTaskIdAndUserId(taskId, userId);
  }

  @Override
  public void deleteById(UUID id) {
    jpaRepository.deleteById(id);
  }
}

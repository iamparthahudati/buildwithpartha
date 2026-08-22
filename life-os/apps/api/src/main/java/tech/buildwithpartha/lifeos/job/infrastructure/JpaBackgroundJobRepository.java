package tech.buildwithpartha.lifeos.job.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobRepository;

@Component
class JpaBackgroundJobRepository implements BackgroundJobRepository {

  private final BackgroundJobJpaRepository jpa;

  JpaBackgroundJobRepository(BackgroundJobJpaRepository jpa) {
    this.jpa = jpa;
  }

  @Override
  public BackgroundJob save(BackgroundJob job) {
    return toDomain(jpa.save(toEntity(job)));
  }

  @Override
  public Optional<BackgroundJob> findById(UUID id) {
    return jpa.findById(id).map(JpaBackgroundJobRepository::toDomain);
  }

  @Override
  public List<BackgroundJob> findDuePending(Instant now, int limit) {
    return jpa.findDuePending(now, limit).stream()
        .map(JpaBackgroundJobRepository::toDomain)
        .toList();
  }

  @Override
  public int deleteTerminalOlderThan(Instant cutoff) {
    return jpa.deleteTerminalOlderThan(cutoff);
  }

  private static BackgroundJobEntity toEntity(BackgroundJob job) {
    return new BackgroundJobEntity(
        job.id(),
        job.userId().orElse(null),
        job.kind(),
        job.payload(),
        job.status(),
        job.attemptCount(),
        job.nextAttemptAt(),
        job.lastAttemptAt().orElse(null),
        job.lastErrorClass().orElse(null),
        job.startedAt().orElse(null),
        job.completedAt().orElse(null),
        job.deadLetteredAt().orElse(null),
        job.createdAt(),
        job.updatedAt());
  }

  private static BackgroundJob toDomain(BackgroundJobEntity e) {
    return new BackgroundJob(
        e.getId(),
        Optional.ofNullable(e.getUserId()),
        e.getJobKind(),
        e.getPayload(),
        e.getStatus(),
        e.getAttemptCount(),
        e.getNextAttemptAt(),
        Optional.ofNullable(e.getLastAttemptAt()),
        Optional.ofNullable(e.getLastErrorClass()),
        Optional.ofNullable(e.getStartedAt()),
        Optional.ofNullable(e.getCompletedAt()),
        Optional.ofNullable(e.getDeadLetteredAt()),
        e.getCreatedAt(),
        e.getUpdatedAt());
  }
}

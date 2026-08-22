package tech.buildwithpartha.lifeos.job.application;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobRepository;

/**
 * Transactionally enqueues a {@link BackgroundJob}. {@link #enqueue} runs with default ({@code
 * REQUIRED}) transaction propagation so it joins the caller's own transaction — the enqueue commits
 * or rolls back atomically with whatever write triggered it (same guarantee as {@code
 * notification.application.MailOutboxService}).
 *
 * <p>Exposed to other domains only through {@code common.job.BackgroundJobPort}, implemented by
 * {@code job.infrastructure.BackgroundJobPortAdapter}.
 */
@Service
public class BackgroundJobEnqueueService {

  private final BackgroundJobRepository repository;
  private final Clock clock;

  public BackgroundJobEnqueueService(BackgroundJobRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Transactional
  public UUID enqueue(UUID userId, BackgroundJobKind kind, String jsonPayload) {
    UUID id = UUID.randomUUID();
    Instant now = clock.instant();
    BackgroundJob job = BackgroundJob.enqueue(id, userId, kind, jsonPayload, now);
    repository.save(job);
    return id;
  }
}

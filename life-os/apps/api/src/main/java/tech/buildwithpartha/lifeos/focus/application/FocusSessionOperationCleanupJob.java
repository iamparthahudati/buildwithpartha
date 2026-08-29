package tech.buildwithpartha.lifeos.focus.application;

import java.time.Clock;
import java.time.Duration;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperationRepository;

/** Enforces the seven-day R1 retention window for idempotency keys. */
@Component
class FocusSessionOperationCleanupJob {

  private static final Duration RETENTION = Duration.ofDays(7);

  private final FocusSessionOperationRepository repository;
  private final Clock clock;

  FocusSessionOperationCleanupJob(FocusSessionOperationRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Scheduled(cron = "0 23 3 * * *", zone = "UTC")
  @Transactional
  void deleteExpiredOperations() {
    repository.deleteCreatedBefore(clock.instant().minus(RETENTION));
  }
}

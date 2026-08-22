package tech.buildwithpartha.lifeos.job.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus;

class BackgroundJobEnqueueServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");

  private FakeBackgroundJobRepository repository;
  private BackgroundJobEnqueueService service;

  @BeforeEach
  void setUp() {
    repository = new FakeBackgroundJobRepository();
    service = new BackgroundJobEnqueueService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void enqueue_savesJobAsPending() {
    UUID userId = UUID.randomUUID();
    UUID jobId = service.enqueue(userId, BackgroundJobKind.DATA_EXPORT, "{\"format\":\"JSON\"}");

    assertThat(jobId).isNotNull();
    BackgroundJob saved = repository.findById(jobId).orElseThrow();
    assertThat(saved.userId()).contains(userId);
    assertThat(saved.kind()).isEqualTo(BackgroundJobKind.DATA_EXPORT);
    assertThat(saved.payload()).isEqualTo("{\"format\":\"JSON\"}");
    assertThat(saved.status()).isEqualTo(BackgroundJobStatus.PENDING);
    assertThat(saved.attemptCount()).isZero();
    assertThat(saved.nextAttemptAt()).isEqualTo(NOW);
    assertThat(saved.createdAt()).isEqualTo(NOW);
    assertThat(saved.updatedAt()).isEqualTo(NOW);
  }

  @Test
  void enqueue_withNullUserId_savesSystemJob() {
    UUID jobId = service.enqueue(null, BackgroundJobKind.ACCOUNT_DELETION, "{}");

    BackgroundJob saved = repository.findById(jobId).orElseThrow();
    assertThat(saved.userId()).isEmpty();
    assertThat(saved.kind()).isEqualTo(BackgroundJobKind.ACCOUNT_DELETION);
  }

  @Test
  void enqueue_eachCallProducesUniqueId() {
    UUID id1 = service.enqueue(UUID.randomUUID(), BackgroundJobKind.DATA_EXPORT, "{}");
    UUID id2 = service.enqueue(UUID.randomUUID(), BackgroundJobKind.DATA_EXPORT, "{}");
    assertThat(id1).isNotEqualTo(id2);
  }
}

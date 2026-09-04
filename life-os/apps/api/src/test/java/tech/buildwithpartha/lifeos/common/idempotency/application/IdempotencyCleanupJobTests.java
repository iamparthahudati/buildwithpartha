package tech.buildwithpartha.lifeos.common.idempotency.application;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class IdempotencyCleanupJobTests {

  @Test
  @DisplayName("Calls idempotencyService.purgeExpired() on job trigger")
  void purgesExpiredRecords() {
    IdempotencyService service = Mockito.mock(IdempotencyService.class);
    when(service.purgeExpired()).thenReturn(5);

    IdempotencyCleanupJob cleanupJob = new IdempotencyCleanupJob(service);
    cleanupJob.purgeExpiredRecords();

    verify(service).purgeExpired();
  }
}

package tech.buildwithpartha.lifeos.common.idempotency.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DataIntegrityViolationException;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.IdempotencyKeyReusedException;
import tech.buildwithpartha.lifeos.common.idempotency.domain.IdempotencyStatus;
import tech.buildwithpartha.lifeos.common.idempotency.infrastructure.IdempotencyRecordEntity;
import tech.buildwithpartha.lifeos.common.idempotency.infrastructure.IdempotencyRecordJpaRepository;

class IdempotencyServiceTests {

  private static final Instant NOW = Instant.parse("2026-09-05T00:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();
  private static final String KEY_HEADER = "valid-key-001";
  private static final String OPERATION_1 = "CREATE_TASK";
  private static final String OPERATION_2 = "CREATE_NOTE";

  private IdempotencyRecordJpaRepository repository;
  private Clock clock;
  private IdempotencyService idempotencyService;

  @BeforeEach
  void setUp() {
    repository = Mockito.mock(IdempotencyRecordJpaRepository.class);
    clock = Clock.fixed(NOW, ZoneOffset.UTC);
    idempotencyService = new IdempotencyService(repository, clock);
  }

  @Test
  @DisplayName("Executes action directly when idempotency header is null or blank")
  void executesDirectlyWithoutHeader() {
    IdempotencyExecutionResult resultNull =
        idempotencyService.execute(
            USER_ID, null, OPERATION_1, () -> IdempotencyExecutionResult.of(201, "{\"id\":1}"));
    IdempotencyExecutionResult resultBlank =
        idempotencyService.execute(
            USER_ID, "   ", OPERATION_1, () -> IdempotencyExecutionResult.of(201, "{\"id\":2}"));

    assertThat(resultNull.responseBody()).isEqualTo("{\"id\":1}");
    assertThat(resultBlank.responseBody()).isEqualTo("{\"id\":2}");
    Mockito.verifyNoInteractions(repository);
  }

  @Test
  @DisplayName("Throws FieldValidationException on invalid idempotency key header format")
  void validatesKeyFormat() {
    assertThatThrownBy(
            () ->
                idempotencyService.execute(
                    USER_ID,
                    "invalid",
                    OPERATION_1,
                    () -> IdempotencyExecutionResult.of(200, "ok")))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  @DisplayName("Saves IN_PROGRESS, executes action, updates COMPLETED, and returns result")
  void executesAndStoresResult() {
    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty());
    Mockito.when(repository.saveAndFlush(any()))
        .thenAnswer(invocation -> invocation.getArgument(0));
    Mockito.when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AtomicInteger count = new AtomicInteger(0);

    IdempotencyExecutionResult result =
        idempotencyService.execute(
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            () -> {
              count.incrementAndGet();
              return IdempotencyExecutionResult.of(201, "{\"status\":\"created\"}");
            });

    assertThat(count.get()).isEqualTo(1);
    assertThat(result.statusCode()).isEqualTo(201);
    assertThat(result.responseBody()).isEqualTo("{\"status\":\"created\"}");
    Mockito.verify(repository).saveAndFlush(any());
    Mockito.verify(repository).save(any());
  }

  @Test
  @DisplayName("Replays cached response without re-executing action when key is COMPLETED")
  void replaysCachedCompletedResponse() {
    IdempotencyRecordEntity completedRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            IdempotencyStatus.COMPLETED,
            201,
            "{\"cached\":true}",
            NOW,
            NOW.plusSeconds(86400));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.of(completedRecord));

    AtomicInteger count = new AtomicInteger(0);

    IdempotencyExecutionResult result =
        idempotencyService.execute(
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            () -> {
              count.incrementAndGet();
              return IdempotencyExecutionResult.of(201, "{\"cached\":false}");
            });

    assertThat(count.get()).isEqualTo(0);
    assertThat(result.statusCode()).isEqualTo(201);
    assertThat(result.responseBody()).isEqualTo("{\"cached\":true}");
  }

  @Test
  @DisplayName("Throws IdempotencyKeyReusedException when key is reused for a different operation")
  void rejectsKeyReuseAcrossOperations() {
    IdempotencyRecordEntity completedRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            IdempotencyStatus.COMPLETED,
            200,
            "{}",
            NOW,
            NOW.plusSeconds(86400));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.of(completedRecord));

    assertThatThrownBy(
            () ->
                idempotencyService.execute(
                    USER_ID,
                    KEY_HEADER,
                    OPERATION_2,
                    () -> IdempotencyExecutionResult.of(200, "{}")))
        .isInstanceOf(IdempotencyKeyReusedException.class);
  }

  @Test
  @DisplayName("Throws ConcurrencyConflictException when request is IN_PROGRESS")
  void rejectsConcurrentInProgressRequest() {
    IdempotencyRecordEntity inProgressRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            IdempotencyStatus.IN_PROGRESS,
            null,
            null,
            NOW,
            NOW.plusSeconds(86400));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.of(inProgressRecord));

    assertThatThrownBy(
            () ->
                idempotencyService.execute(
                    USER_ID,
                    KEY_HEADER,
                    OPERATION_1,
                    () -> IdempotencyExecutionResult.of(200, "{}")))
        .isInstanceOf(ConcurrencyConflictException.class);
  }

  @Test
  @DisplayName("Purges expired record and re-executes action as new request")
  void purgesExpiredAndReexecutes() {
    IdempotencyRecordEntity expiredRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            IdempotencyStatus.COMPLETED,
            200,
            "{\"old\":true}",
            NOW.minusSeconds(86400 * 10),
            NOW.minusSeconds(86400 * 3));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.of(expiredRecord));
    Mockito.when(repository.saveAndFlush(any()))
        .thenAnswer(invocation -> invocation.getArgument(0));
    Mockito.when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    IdempotencyExecutionResult result =
        idempotencyService.execute(
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            () -> IdempotencyExecutionResult.of(201, "{\"new\":true}"));

    Mockito.verify(repository).delete(expiredRecord);
    assertThat(result.responseBody()).isEqualTo("{\"new\":true}");
  }

  @Test
  @DisplayName("Deletes previously FAILED record and allows retry execution")
  void deletesFailedRecordAndRetries() {
    IdempotencyRecordEntity failedRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            IdempotencyStatus.FAILED,
            500,
            "error",
            NOW,
            NOW.plusSeconds(86400));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.of(failedRecord));
    Mockito.when(repository.saveAndFlush(any()))
        .thenAnswer(invocation -> invocation.getArgument(0));
    Mockito.when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    IdempotencyExecutionResult result =
        idempotencyService.execute(
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            () -> IdempotencyExecutionResult.of(200, "{\"retried\":true}"));

    Mockito.verify(repository).delete(failedRecord);
    assertThat(result.responseBody()).isEqualTo("{\"retried\":true}");
  }

  @Test
  @DisplayName("Marks record FAILED when action throws exception and rethrows exception")
  void marksFailedOnException() {
    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty());
    Mockito.when(repository.saveAndFlush(any()))
        .thenAnswer(invocation -> invocation.getArgument(0));

    assertThatThrownBy(
            () ->
                idempotencyService.execute(
                    USER_ID,
                    KEY_HEADER,
                    OPERATION_1,
                    () -> {
                      throw new IllegalStateException("Database failed");
                    }))
        .isInstanceOf(IllegalStateException.class);

    Mockito.verify(repository)
        .save(Mockito.argThat(e -> e.getStatus() == IdempotencyStatus.FAILED));
  }

  @Test
  @DisplayName("Handles DataIntegrityViolationException on concurrent insert race condition")
  void handlesDataIntegrityViolationFallback() {
    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty());
    Mockito.when(repository.saveAndFlush(any()))
        .thenThrow(new DataIntegrityViolationException("Duplicate key"));

    IdempotencyRecordEntity completedRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            IdempotencyStatus.COMPLETED,
            200,
            "{\"race\":\"won\"}",
            NOW,
            NOW.plusSeconds(86400));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(completedRecord));

    IdempotencyExecutionResult result =
        idempotencyService.execute(
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            () -> IdempotencyExecutionResult.of(200, "{\"race\":\"lost\"}"));

    assertThat(result.responseBody()).isEqualTo("{\"race\":\"won\"}");
  }

  @Test
  @DisplayName("Handles DataIntegrityViolationException key reuse fallback branch")
  void handlesDataIntegrityViolationKeyReuseFallback() {
    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty());
    Mockito.when(repository.saveAndFlush(any()))
        .thenThrow(new DataIntegrityViolationException("Duplicate key"));

    IdempotencyRecordEntity differentOpRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_2,
            IdempotencyStatus.COMPLETED,
            200,
            "{}",
            NOW,
            NOW.plusSeconds(86400));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(differentOpRecord));

    assertThatThrownBy(
            () ->
                idempotencyService.execute(
                    USER_ID,
                    KEY_HEADER,
                    OPERATION_1,
                    () -> IdempotencyExecutionResult.of(200, "{}")))
        .isInstanceOf(IdempotencyKeyReusedException.class);
  }

  @Test
  @DisplayName("Handles DataIntegrityViolationException in-progress fallback branch")
  void handlesDataIntegrityViolationInProgressFallback() {
    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty());
    Mockito.when(repository.saveAndFlush(any()))
        .thenThrow(new DataIntegrityViolationException("Duplicate key"));

    IdempotencyRecordEntity inProgressRecord =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            USER_ID,
            KEY_HEADER,
            OPERATION_1,
            IdempotencyStatus.IN_PROGRESS,
            null,
            null,
            NOW,
            NOW.plusSeconds(86400));

    Mockito.when(repository.findByUserIdAndIdempotencyKey(USER_ID, KEY_HEADER))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(inProgressRecord));

    assertThatThrownBy(
            () ->
                idempotencyService.execute(
                    USER_ID,
                    KEY_HEADER,
                    OPERATION_1,
                    () -> IdempotencyExecutionResult.of(200, "{}")))
        .isInstanceOf(ConcurrencyConflictException.class);
  }

  @Test
  @DisplayName("Deletes expired records before specified instant")
  void deletesExpiredBeforeInstant() {
    idempotencyService.deleteExpiredBefore(NOW);
    Mockito.verify(repository).deleteExpiredBefore(NOW);
  }
}

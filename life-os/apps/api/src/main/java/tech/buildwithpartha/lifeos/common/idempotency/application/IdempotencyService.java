package tech.buildwithpartha.lifeos.common.idempotency.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.IdempotencyKeyReusedException;
import tech.buildwithpartha.lifeos.common.idempotency.domain.IdempotencyKey;
import tech.buildwithpartha.lifeos.common.idempotency.domain.IdempotencyStatus;
import tech.buildwithpartha.lifeos.common.idempotency.infrastructure.IdempotencyRecordEntity;
import tech.buildwithpartha.lifeos.common.idempotency.infrastructure.IdempotencyRecordJpaRepository;

/** Service managing generic idempotency header validation, replay, and record retention. */
@Service
public class IdempotencyService {

  private static final Duration DEFAULT_RETENTION = Duration.ofDays(7);

  private final IdempotencyRecordJpaRepository repository;
  private final Clock clock;

  public IdempotencyService(IdempotencyRecordJpaRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Transactional
  public IdempotencyExecutionResult execute(
      UUID userId,
      String idempotencyKeyHeader,
      String operationType,
      Supplier<IdempotencyExecutionResult> action) {
    if (idempotencyKeyHeader == null || idempotencyKeyHeader.isBlank()) {
      return action.get();
    }

    IdempotencyKey key = IdempotencyKey.of(idempotencyKeyHeader);
    Instant now = clock.instant();

    Optional<IdempotencyRecordEntity> existingOpt =
        repository.findByUserIdAndIdempotencyKey(userId, key.value());

    if (existingOpt.isPresent()) {
      IdempotencyRecordEntity existing = existingOpt.get();

      if (existing.getExpiresAt().isBefore(now)) {
        repository.delete(existing);
      } else {
        if (!existing.getOperationType().equals(operationType)) {
          throw new IdempotencyKeyReusedException(
              "Idempotency key '" + key.value() + "' was already used for a different operation");
        }

        if (existing.getStatus() == IdempotencyStatus.COMPLETED) {
          return IdempotencyExecutionResult.of(
              existing.getResponseCode() != null ? existing.getResponseCode() : 200,
              existing.getResponseBody());
        }

        if (existing.getStatus() == IdempotencyStatus.IN_PROGRESS) {
          throw new ConcurrencyConflictException(
              "A request with idempotency key '" + key.value() + "' is currently in progress");
        }

        if (existing.getStatus() == IdempotencyStatus.FAILED) {
          repository.delete(existing);
        }
      }
    }

    IdempotencyRecordEntity entity =
        new IdempotencyRecordEntity(
            UUID.randomUUID(),
            userId,
            key.value(),
            operationType,
            IdempotencyStatus.IN_PROGRESS,
            null,
            null,
            now,
            now.plus(DEFAULT_RETENTION));

    try {
      entity = repository.saveAndFlush(entity);
    } catch (DataIntegrityViolationException ex) {
      Optional<IdempotencyRecordEntity> recheck =
          repository.findByUserIdAndIdempotencyKey(userId, key.value());
      if (recheck.isPresent()) {
        IdempotencyRecordEntity existing = recheck.get();
        if (!existing.getOperationType().equals(operationType)) {
          throw new IdempotencyKeyReusedException(
              "Idempotency key '" + key.value() + "' was already used for a different operation");
        }
        if (existing.getStatus() == IdempotencyStatus.COMPLETED) {
          return IdempotencyExecutionResult.of(
              existing.getResponseCode() != null ? existing.getResponseCode() : 200,
              existing.getResponseBody());
        }
      }
      throw new ConcurrencyConflictException(
          "A request with idempotency key '" + key.value() + "' is currently in progress");
    }

    try {
      IdempotencyExecutionResult result = action.get();
      entity.setStatus(IdempotencyStatus.COMPLETED);
      entity.setResponseCode(result.statusCode());
      entity.setResponseBody(result.responseBody());
      repository.save(entity);
      return result;
    } catch (RuntimeException ex) {
      entity.setStatus(IdempotencyStatus.FAILED);
      repository.save(entity);
      throw ex;
    }
  }

  @Transactional
  public int deleteExpiredBefore(Instant threshold) {
    return repository.deleteExpiredBefore(threshold);
  }

  @Transactional
  public int purgeExpired() {
    return deleteExpiredBefore(clock.instant());
  }
}

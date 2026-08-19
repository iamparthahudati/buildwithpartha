package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriodRepository;

@Component
class JpaAccountDeletionGracePeriodRepository implements AccountDeletionGracePeriodRepository {

  private final AccountDeletionGracePeriodJpaRepository jpaRepository;

  JpaAccountDeletionGracePeriodRepository(AccountDeletionGracePeriodJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public AccountDeletionGracePeriod save(AccountDeletionGracePeriod gracePeriod) {
    return toDomain(jpaRepository.save(toEntity(gracePeriod)));
  }

  @Override
  public Optional<AccountDeletionGracePeriod> findByTokenHash(String cancellationTokenHash) {
    return jpaRepository
        .findByCancellationTokenHash(cancellationTokenHash)
        .map(JpaAccountDeletionGracePeriodRepository::toDomain);
  }

  @Override
  public List<AccountDeletionGracePeriod> findDueForPurge(Instant now) {
    return jpaRepository.findDueForPurge(now).stream()
        .map(JpaAccountDeletionGracePeriodRepository::toDomain)
        .toList();
  }

  @Override
  public boolean cancelIfInGracePeriod(UUID id, Instant cancelledAt) {
    return jpaRepository.cancelIfInGracePeriod(id, cancelledAt) == 1;
  }

  @Override
  public boolean markPurgedIfInGracePeriod(UUID id, Instant purgedAt) {
    return jpaRepository.markPurgedIfInGracePeriod(id, purgedAt) == 1;
  }

  private static AccountDeletionGracePeriodEntity toEntity(AccountDeletionGracePeriod domain) {
    return new AccountDeletionGracePeriodEntity(
        domain.id(),
        domain.userId(),
        domain.status(),
        domain.cancellationTokenHash(),
        domain.requestedAt(),
        domain.scheduledPurgeAt(),
        domain.cancelledAt().orElse(null),
        domain.purgedAt().orElse(null),
        domain.createdAt());
  }

  private static AccountDeletionGracePeriod toDomain(AccountDeletionGracePeriodEntity entity) {
    return new AccountDeletionGracePeriod(
        entity.getId(),
        entity.getUserId(),
        entity.getStatus(),
        entity.getCancellationTokenHash(),
        entity.getRequestedAt(),
        entity.getScheduledPurgeAt(),
        Optional.ofNullable(entity.getCancelledAt()),
        Optional.ofNullable(entity.getPurgedAt()),
        entity.getCreatedAt());
  }
}

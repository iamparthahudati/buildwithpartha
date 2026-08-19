package tech.buildwithpartha.lifeos.auth.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriodRepository;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus;

final class FakeAccountDeletionGracePeriodRepository
    implements AccountDeletionGracePeriodRepository {

  private final ConcurrentHashMap<UUID, AccountDeletionGracePeriod> rows =
      new ConcurrentHashMap<>();

  @Override
  public AccountDeletionGracePeriod save(AccountDeletionGracePeriod gracePeriod) {
    rows.put(gracePeriod.id(), gracePeriod);
    return gracePeriod;
  }

  @Override
  public Optional<AccountDeletionGracePeriod> findByTokenHash(String cancellationTokenHash) {
    return rows.values().stream()
        .filter(row -> row.cancellationTokenHash().equals(cancellationTokenHash))
        .findFirst();
  }

  @Override
  public List<AccountDeletionGracePeriod> findDueForPurge(Instant now) {
    List<AccountDeletionGracePeriod> due = new ArrayList<>();
    for (AccountDeletionGracePeriod row : rows.values()) {
      if (row.status() == AccountDeletionRequestStatus.GRACE_PERIOD
          && !row.scheduledPurgeAt().isAfter(now)) {
        due.add(row);
      }
    }
    return due;
  }

  @Override
  public boolean cancelIfInGracePeriod(UUID id, Instant cancelledAt) {
    AccountDeletionGracePeriod row = rows.get(id);
    if (row == null || row.status() != AccountDeletionRequestStatus.GRACE_PERIOD) {
      return false;
    }
    rows.put(
        id,
        new AccountDeletionGracePeriod(
            row.id(),
            row.userId(),
            AccountDeletionRequestStatus.CANCELLED,
            row.cancellationTokenHash(),
            row.requestedAt(),
            row.scheduledPurgeAt(),
            Optional.of(cancelledAt),
            row.purgedAt(),
            row.createdAt()));
    return true;
  }

  @Override
  public boolean markPurgedIfInGracePeriod(UUID id, Instant purgedAt) {
    AccountDeletionGracePeriod row = rows.get(id);
    if (row == null || row.status() != AccountDeletionRequestStatus.GRACE_PERIOD) {
      return false;
    }
    rows.put(
        id,
        new AccountDeletionGracePeriod(
            row.id(),
            row.userId(),
            AccountDeletionRequestStatus.PURGED,
            row.cancellationTokenHash(),
            row.requestedAt(),
            row.scheduledPurgeAt(),
            row.cancelledAt(),
            Optional.of(purgedAt),
            row.createdAt()));
    return true;
  }

  Optional<AccountDeletionGracePeriod> findById(UUID id) {
    return Optional.ofNullable(rows.get(id));
  }

  List<AccountDeletionGracePeriod> all() {
    return List.copyOf(rows.values());
  }
}

package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface AccountDeletionGracePeriodJpaRepository
    extends JpaRepository<AccountDeletionGracePeriodEntity, UUID> {

  String GRACE_PERIOD =
      "tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus.GRACE_PERIOD";
  String CANCELLED =
      "tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus.CANCELLED";
  String PURGED = "tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus.PURGED";

  Optional<AccountDeletionGracePeriodEntity> findByCancellationTokenHash(
      String cancellationTokenHash);

  @Query(
      "SELECT r FROM AccountDeletionGracePeriodEntity r WHERE r.status = "
          + GRACE_PERIOD
          + " AND r.scheduledPurgeAt <= :now")
  List<AccountDeletionGracePeriodEntity> findDueForPurge(@Param("now") Instant now);

  /**
   * The single-use guard, the same conditional-update shape {@code
   * EmailVerificationTokenJpaRepository#consumeIfUnconsumed} established: only a still-{@code
   * GRACE_PERIOD} row transitions, so a cancellation racing the daily purge job can never both win.
   * {@code clearAutomatically}/{@code flushAutomatically} avoid the stale-read/lost-write trap
   * documented there.
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "UPDATE AccountDeletionGracePeriodEntity r SET r.status = "
          + CANCELLED
          + ", r.cancelledAt = :cancelledAt WHERE r.id = :id AND r.status = "
          + GRACE_PERIOD)
  int cancelIfInGracePeriod(@Param("id") UUID id, @Param("cancelledAt") Instant cancelledAt);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "UPDATE AccountDeletionGracePeriodEntity r SET r.status = "
          + PURGED
          + ", r.purgedAt = :purgedAt WHERE r.id = :id AND r.status = "
          + GRACE_PERIOD)
  int markPurgedIfInGracePeriod(@Param("id") UUID id, @Param("purgedAt") Instant purgedAt);
}

package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * A port over {@code public.account_deletion_requests}, implemented in {@code auth.infrastructure}
 * with JPA.
 */
public interface AccountDeletionGracePeriodRepository {

  AccountDeletionGracePeriod save(AccountDeletionGracePeriod gracePeriod);

  Optional<AccountDeletionGracePeriod> findByTokenHash(String cancellationTokenHash);

  /**
   * Every request still in its cancellable window whose {@code scheduledPurgeAt} has passed — what
   * {@code AccountDeletionPurgeJob}'s daily sweep purges.
   */
  List<AccountDeletionGracePeriod> findDueForPurge(Instant now);

  /**
   * Atomically cancels the request, but only if it is still {@link
   * AccountDeletionRequestStatus#GRACE_PERIOD} ({@code UPDATE ... WHERE status = 'GRACE_PERIOD'},
   * the same conditional-update shape {@code EmailVerificationTokenRepository#consume}
   * established). Returns {@code true} when this call is the one that cancelled it, {@code false}
   * when it was already cancelled or already purged.
   */
  boolean cancelIfInGracePeriod(UUID id, Instant cancelledAt);

  /**
   * Atomically marks the request purged, but only if it is still {@link
   * AccountDeletionRequestStatus#GRACE_PERIOD}. Returns {@code true} when this call is the one that
   * purged it, {@code false} when a concurrent cancellation won the race first — in which case the
   * purge job must not delete the user row.
   */
  boolean markPurgedIfInGracePeriod(UUID id, Instant purgedAt);
}

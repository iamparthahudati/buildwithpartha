package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriodRepository;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Purges accounts whose deletion grace period has elapsed uncancelled (LOS-0518's {@code
 * PURGE_IN_PROGRESS -> PURGED_LIVE} transition, {@code 31-PRIVACY-DATA-LIFECYCLE.md}).
 *
 * <p>Deleting {@code public.users} cascades through every foreign-keyed child table (credentials,
 * sessions, tokens, preferences, exports, ...) — the "parent/child order and foreign keys cannot
 * strand private records" requirement is the database's own {@code ON DELETE CASCADE}, not
 * application code. The {@code account_deletion_requests} row itself is deliberately not deleted:
 * it becomes the minimal deletion evidence the privacy spec's R6/R8 retention classes allow.
 */
@Service
public class AccountDeletionPurgeService {

  private static final Logger log = LoggerFactory.getLogger(AccountDeletionPurgeService.class);
  private static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final AccountDeletionGracePeriodRepository gracePeriodRepository;
  private final UserRepository userRepository;
  private final Clock clock;

  public AccountDeletionPurgeService(
      AccountDeletionGracePeriodRepository gracePeriodRepository,
      UserRepository userRepository,
      Clock clock) {
    this.gracePeriodRepository = gracePeriodRepository;
    this.userRepository = userRepository;
    this.clock = clock;
  }

  /**
   * Purges every account whose grace period is due, one independent transaction per account so a
   * single failure cannot abort the rest of the sweep.
   *
   * @return the number of accounts purged
   */
  public int purgeDueAccounts() {
    Instant now = clock.instant();
    List<AccountDeletionGracePeriod> due = gracePeriodRepository.findDueForPurge(now);

    int purged = 0;
    for (AccountDeletionGracePeriod gracePeriod : due) {
      try {
        if (purgeOne(gracePeriod, now)) {
          purged++;
        }
      } catch (RuntimeException ex) {
        log.error(
            "account deletion purge failed requestId={} userId={}",
            gracePeriod.id(),
            gracePeriod.userId(),
            ex);
      }
    }
    return purged;
  }

  @Transactional
  boolean purgeOne(AccountDeletionGracePeriod gracePeriod, Instant now) {
    // Conditional: a concurrent cancellation may have won the race since findDueForPurge ran.
    if (!gracePeriodRepository.markPurgedIfInGracePeriod(gracePeriod.id(), now)) {
      return false;
    }
    userRepository.deleteById(gracePeriod.userId());
    AUDIT_LOGGER.info(
        "event=account_deletion_purged userId={} requestId={}",
        gracePeriod.userId(),
        gracePeriod.id());
    return true;
  }
}

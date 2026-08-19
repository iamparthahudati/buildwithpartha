package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriodRepository;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.TokenAlreadyUsedException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.error.TokenInvalidException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;

/**
 * Consumes the single-use cancellation token {@link AccountDeletionService} emails, restoring the
 * account before its grace period elapses (LOS-0518's {@code CANCELLED_BY_VERIFIED_OWNER}
 * transition, {@code 31-PRIVACY-DATA-LIFECYCLE.md}).
 *
 * <p>{@link AccountDeletionGracePeriodRepository#cancelIfInGracePeriod} is a single conditional
 * {@code UPDATE ... WHERE status = 'GRACE_PERIOD'}, not a read-then-write from this service — the
 * same race-safe shape {@link EmailVerificationService#verify} established — so a token presented
 * twice, or racing {@code AccountDeletionPurgeJob}'s own purge, can restore the account at most
 * once.
 */
@Service
public class CancelAccountDeletionService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final AccountDeletionGracePeriodRepository gracePeriodRepository;
  private final UserRepository userRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final TransactionalMailPort mailPort;
  private final Clock clock;

  public CancelAccountDeletionService(
      AccountDeletionGracePeriodRepository gracePeriodRepository,
      UserRepository userRepository,
      SecureTokenGenerator tokenGenerator,
      TransactionalMailPort mailPort,
      Clock clock) {
    this.gracePeriodRepository = gracePeriodRepository;
    this.userRepository = userRepository;
    this.tokenGenerator = tokenGenerator;
    this.mailPort = mailPort;
    this.clock = clock;
  }

  @Transactional
  public void cancel(String rawToken) {
    String tokenHash = tokenGenerator.hash(rawToken);
    AccountDeletionGracePeriod gracePeriod =
        gracePeriodRepository.findByTokenHash(tokenHash).orElseThrow(this::invalid);

    if (gracePeriod.status() == AccountDeletionRequestStatus.PURGED) {
      AUDIT_LOGGER.info("event=account_deletion_cancel_failed reason=already_purged");
      throw new TokenExpiredException("account already purged");
    }
    if (gracePeriod.status() == AccountDeletionRequestStatus.CANCELLED) {
      throw alreadyUsed();
    }

    Instant now = clock.instant();
    if (!gracePeriodRepository.cancelIfInGracePeriod(gracePeriod.id(), now)) {
      // Lost the race against a concurrent cancel or the purge job.
      throw alreadyUsed();
    }

    User user =
        userRepository
            .findById(gracePeriod.userId())
            .orElseThrow(() -> new IllegalStateException("deletion request references no user"));
    userRepository.save(user.restoreFromPendingDeletion(now));

    mailPort.enqueue(
        user.id(),
        MailMessageKind.SECURITY_ALERT,
        MailRecipient.of(user.email().raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName",
                user.displayName(),
                "eventDescription",
                "Your account deletion request was cancelled. Your account is active again.",
                "occurredAt",
                now.toString())));

    AUDIT_LOGGER.info("event=account_deletion_cancelled userId={}", user.id());
  }

  private TokenInvalidException invalid() {
    AUDIT_LOGGER.info("event=account_deletion_cancel_failed reason=invalid");
    return new TokenInvalidException("cancellation token not found");
  }

  private TokenAlreadyUsedException alreadyUsed() {
    AUDIT_LOGGER.info("event=account_deletion_cancel_failed reason=already_used");
    return new TokenAlreadyUsedException("cancellation token already used");
  }
}

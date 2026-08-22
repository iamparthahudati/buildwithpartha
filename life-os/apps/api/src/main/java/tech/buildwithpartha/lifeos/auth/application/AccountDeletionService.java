package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriodRepository;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

/**
 * Requests account deletion under the accepted ADR-012 state machine ({@code
 * 31-PRIVACY-DATA-LIFECYCLE.md}: {@code ACTIVE -> DELETE_REQUESTED -> GRACE_PERIOD (30 days,
 * cancellable) -> PURGE_IN_PROGRESS -> PURGED_LIVE}, LOS-0518).
 *
 * <p>Re-authenticates the caller, revokes every session and moves the account to {@link
 * tech.buildwithpartha.lifeos.auth.domain.AccountStatus#PENDING_DELETION} immediately — {@code
 * LoginService} will no longer authenticate it — but does not delete the user row. A single-use
 * cancellation token travels in a security-alert email; {@link CancelAccountDeletionService}
 * consumes it. {@code AccountDeletionPurgeJob} performs the actual purge once the grace period
 * ({@link AccountDeletionGracePeriod#GRACE_PERIOD}) elapses uncancelled.
 */
@Service
public class AccountDeletionService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final SessionRepository sessionRepository;
  private final AccountDeletionGracePeriodRepository gracePeriodRepository;
  private final PasswordHasher passwordHasher;
  private final SecureTokenGenerator tokenGenerator;
  private final BackgroundJobPort backgroundJobPort;
  private final TransactionalMailPort mailPort;
  private final LifeOsEnvironmentProperties environmentProperties;
  private final Clock clock;

  public AccountDeletionService(
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      SessionRepository sessionRepository,
      AccountDeletionGracePeriodRepository gracePeriodRepository,
      PasswordHasher passwordHasher,
      SecureTokenGenerator tokenGenerator,
      BackgroundJobPort backgroundJobPort,
      TransactionalMailPort mailPort,
      LifeOsEnvironmentProperties environmentProperties,
      Clock clock) {
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.sessionRepository = sessionRepository;
    this.gracePeriodRepository = gracePeriodRepository;
    this.passwordHasher = passwordHasher;
    this.tokenGenerator = tokenGenerator;
    this.backgroundJobPort = backgroundJobPort;
    this.mailPort = mailPort;
    this.environmentProperties = environmentProperties;
    this.clock = clock;
  }

  /**
   * Re-authenticates the user with their password, validates the confirmation phrase, revokes all
   * active sessions, enters the 30-day grace period, and emails a single-use cancellation link.
   *
   * @param userId the user id
   * @param rawPassword the current account password
   * @param confirmationText confirmation phrase matching account email or display name
   * @return the request and scheduled purge instants
   */
  @Transactional
  public AccountDeletionOutcome deleteAccount(
      UUID userId, RawPassword rawPassword, String confirmationText) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new IllegalStateException("User not found: " + userId));

    boolean matchesEmail = confirmationText.trim().equalsIgnoreCase(user.email().raw());
    boolean matchesName = confirmationText.trim().equalsIgnoreCase(user.displayName().trim());
    if (!matchesEmail && !matchesName) {
      throw new FieldValidationException(
          "Confirmation text does not match account name or email",
          List.of(new FieldProblem("confirmationText", "CONFIRMATION_MISMATCH")));
    }

    Credential credential =
        credentialRepository
            .findByUserId(userId)
            .orElseThrow(
                () -> new IllegalStateException("Credentials missing for user: " + userId));

    if (!passwordHasher.matches(rawPassword, credential.passwordHash())) {
      AUDIT_LOGGER.info(
          "event=account_deletion_rejected reason=invalid_password userId={}", userId);
      throw new FieldValidationException(
          "Invalid current password",
          List.of(new FieldProblem("currentPassword", "INVALID_CURRENT_PASSWORD")));
    }

    Instant now = clock.instant();

    // 1. Revoke all active sessions immediately — the account becomes inaccessible for the
    // duration of the grace period regardless of the eventual outcome.
    int revokedSessions = sessionRepository.revokeAllForUser(userId, now);

    // 2. Enter the grace period and mint a single-use cancellation token.
    RawToken cancellationToken = tokenGenerator.generate();
    AccountDeletionGracePeriod gracePeriod =
        gracePeriodRepository.save(
            AccountDeletionGracePeriod.request(
                UUID.randomUUID(), userId, cancellationToken.hash(), now));

    // 3. Move the account out of ACTIVE so LoginService stops authenticating it, without
    // deleting the row: cancellation restores it exactly as it was.
    userRepository.save(user.requestDeletion(now));

    // 4. Security alert carrying the cancellation link and the grace-period deadline.
    String cancelUrl =
        environmentProperties.publicUrl() + "/cancel-deletion?token=" + cancellationToken.value();
    mailPort.enqueue(
        userId,
        MailMessageKind.SECURITY_ALERT,
        MailRecipient.of(user.email().raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName",
                user.displayName(),
                "eventDescription",
                "Your LifeOS account is scheduled for deletion in 30 days. All active sessions"
                    + " have been revoked. If this wasn't you, use the link below to cancel"
                    + " before then.",
                "occurredAt",
                DateTimeFormatter.ISO_INSTANT.format(now),
                "cancelUrl",
                cancelUrl)));

    // 5. Audit-trail marker only — AccountDeletionPurgeJob's daily sweep performs the actual
    // purge once the grace period elapses uncancelled, not this job.
    backgroundJobPort.enqueue(userId, BackgroundJobKind.ACCOUNT_DELETION, "{}");

    AUDIT_LOGGER.info(
        "event=account_deletion_requested userId={} revokedSessions={} scheduledPurgeAt={}",
        userId,
        revokedSessions,
        gracePeriod.scheduledPurgeAt());

    return new AccountDeletionOutcome(now, gracePeriod.scheduledPurgeAt());
  }
}

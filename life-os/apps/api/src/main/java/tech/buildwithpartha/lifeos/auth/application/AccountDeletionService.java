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
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
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

/**
 * Service managing the verified account deletion lifecycle, credential re-authentication,
 * session revocation, and data purge scheduling (LOS-0518).
 */
@Service
public class AccountDeletionService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final SessionRepository sessionRepository;
  private final PasswordHasher passwordHasher;
  private final BackgroundJobPort backgroundJobPort;
  private final TransactionalMailPort mailPort;
  private final Clock clock;

  public AccountDeletionService(
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      SessionRepository sessionRepository,
      PasswordHasher passwordHasher,
      BackgroundJobPort backgroundJobPort,
      TransactionalMailPort mailPort,
      Clock clock) {
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.sessionRepository = sessionRepository;
    this.passwordHasher = passwordHasher;
    this.backgroundJobPort = backgroundJobPort;
    this.mailPort = mailPort;
    this.clock = clock;
  }

  /**
   * Re-authenticates the user with their password, validates confirmation phrase, revokes all
   * active sessions, enqueues an account deletion background job, sends a security alert email, and
   * deletes the user record.
   *
   * @param userId the user id
   * @param rawPassword the current account password
   * @param confirmationText confirmation phrase matching account email or display name
   * @return canonical deletion instant
   */
  @Transactional
  public Instant deleteAccount(UUID userId, RawPassword rawPassword, String confirmationText) {
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

    // 1. Revoke all active sessions immediately
    int revokedSessions = sessionRepository.revokeAllForUser(userId, now);

    // 2. Send security alert email before deletion completes
    mailPort.enqueue(
        userId,
        MailMessageKind.SECURITY_ALERT,
        MailRecipient.of(user.email().raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName", user.displayName(),
                "eventDescription",
                "Your LifeOS account has been deleted as requested. All active sessions have been"
                    + " revoked.",
                "occurredAt", DateTimeFormatter.ISO_INSTANT.format(now))));

    // 3. Enqueue background job for any downstream asynchronous purges
    backgroundJobPort.enqueue(userId, BackgroundJobKind.ACCOUNT_DELETION, "{}");

    // 4. Delete user record (database ON DELETE CASCADE purges all child records)
    userRepository.deleteById(userId);

    AUDIT_LOGGER.info(
        "event=account_deleted userId={} revokedSessions={}", userId, revokedSessions);

    return now;
  }
}

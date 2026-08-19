package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.PasswordValidationResult;
import tech.buildwithpartha.lifeos.auth.domain.PasswordVerification;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;

/**
 * Authenticated password change service (LOS-0516).
 *
 * <p>Verifies the caller's current password against their stored Argon2id credential, enforces
 * password policy on the new password, updates the credential hash, revokes every other active
 * session belonging to the account (preserving the current session), and sends a security alert
 * notification.
 */
@Service
public class ChangePasswordService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final SessionRepository sessionRepository;
  private final PasswordService passwordService;
  private final PasswordAuthenticationService passwordAuthenticationService;
  private final SecureTokenGenerator tokenGenerator;
  private final TransactionalMailPort mailPort;
  private final Clock clock;

  public ChangePasswordService(
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      SessionRepository sessionRepository,
      PasswordService passwordService,
      PasswordAuthenticationService passwordAuthenticationService,
      SecureTokenGenerator tokenGenerator,
      TransactionalMailPort mailPort,
      Clock clock) {
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.sessionRepository = sessionRepository;
    this.passwordService = passwordService;
    this.passwordAuthenticationService = passwordAuthenticationService;
    this.tokenGenerator = tokenGenerator;
    this.mailPort = mailPort;
    this.clock = clock;
  }

  @Transactional
  public void changePassword(ChangePasswordCommand command) {
    User user =
        userRepository
            .findById(command.userId())
            .orElseThrow(() -> new IllegalStateException("authenticated user does not exist"));

    Credential credential =
        credentialRepository
            .findByUserId(user.id())
            .orElseThrow(() -> new IllegalStateException("user has no credential"));

    PasswordVerification verification =
        passwordAuthenticationService.verify(command.currentPassword(), credential.passwordHash());

    if (!verification.matched()) {
      AUDIT_LOGGER.info("event=change_password_failed reason=invalid_current_password");
      throw new FieldValidationException(
          "current password is incorrect",
          List.of(new FieldProblem("currentPassword", "INVALID_CURRENT_PASSWORD")));
    }

    PasswordValidationResult validation = passwordService.validate(command.newPassword());
    if (!validation.isValid()) {
      throw passwordPolicyViolation(validation);
    }

    Instant now = clock.instant();
    String newHash = passwordService.hash(command.newPassword());
    credentialRepository.save(credential.rehash(newHash, now));

    Optional<Session> currentSession =
        command
            .currentSessionToken()
            .map(tokenGenerator::hash)
            .flatMap(sessionRepository::findByTokenHash)
            .filter(s -> s.userId().equals(user.id()) && s.isActive(now));

    int revokedCount;
    if (currentSession.isPresent()) {
      revokedCount =
          sessionRepository.revokeAllOtherSessionsForUser(
              user.id(), currentSession.get().id(), now);
    } else {
      revokedCount = sessionRepository.revokeAllForUser(user.id(), now);
    }

    mailPort.enqueue(
        user.id(),
        MailMessageKind.SECURITY_ALERT,
        MailRecipient.of(user.email().raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName", user.displayName(),
                "eventDescription", "Your password was changed.",
                "occurredAt", DateTimeFormatter.ISO_INSTANT.format(now))));

    AUDIT_LOGGER.info(
        "event=change_password_succeeded userId={} otherSessionsRevoked={}",
        user.id(),
        revokedCount);
  }

  private static FieldValidationException passwordPolicyViolation(
      PasswordValidationResult validation) {
    List<FieldProblem> errors =
        validation.violations().stream()
            .map(violation -> new FieldProblem("newPassword", violation.name()))
            .sorted(Comparator.comparing(FieldProblem::code))
            .toList();
    return new FieldValidationException("new password does not meet policy", errors);
  }
}

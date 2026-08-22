package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.PasswordValidationResult;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.TokenAlreadyUsedException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.error.TokenInvalidException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;

/**
 * Consumes a single-use {@link PasswordResetToken} ({@code ForgotPasswordService} issues it),
 * replaces the account's password, revokes every one of its sessions, and sends a security notice
 * (LOS-0507).
 *
 * <p>Token validity is checked in the same order LOS-0504's {@code EmailVerificationService}
 * established — not found, then already-used, then expired, only then attempting the atomic {@code
 * consume} — so an expired or already-used token is reported precisely rather than folded into one
 * generic failure. The new password is policy-validated <em>before</em> the token is consumed: a
 * policy violation must not burn a still-valid link, since the caller should be able to retry the
 * same link with a compliant password.
 *
 * <p>{@code 24-CRITICAL-USER-JOURNEYS.md}: "Single-use reset updates the password, revokes required
 * sessions and sends a security notice" — every existing session for the account is revoked ({@link
 * SessionRepository#revokeAllForUser}), not only sessions on a specific device, since a password
 * reset is exactly the moment an account may have been compromised and every other session should
 * stop working immediately. No new session is issued here; the caller must log in again with the
 * new password (LOS-0505).
 */
@Service
public class ResetPasswordService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final PasswordResetTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final SessionRepository sessionRepository;
  private final PasswordService passwordService;
  private final SecureTokenGenerator tokenGenerator;
  private final TransactionalMailPort mailPort;
  private final Clock clock;

  public ResetPasswordService(
      PasswordResetTokenRepository tokenRepository,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      SessionRepository sessionRepository,
      PasswordService passwordService,
      SecureTokenGenerator tokenGenerator,
      TransactionalMailPort mailPort,
      Clock clock) {
    this.tokenRepository = tokenRepository;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.sessionRepository = sessionRepository;
    this.passwordService = passwordService;
    this.tokenGenerator = tokenGenerator;
    this.mailPort = mailPort;
    this.clock = clock;
  }

  @Transactional
  public void reset(ResetPasswordCommand command) {
    String tokenHash = tokenGenerator.hash(command.token());
    PasswordResetToken token =
        tokenRepository
            .findByTokenHash(tokenHash)
            .orElseThrow(
                () -> {
                  AUDIT_LOGGER.info("event=password_reset_failed reason=invalid");
                  return new TokenInvalidException("password reset token not found");
                });

    if (token.consumedAt().isPresent()) {
      AUDIT_LOGGER.info("event=password_reset_failed reason=already_used");
      throw new TokenAlreadyUsedException("password reset token already used");
    }

    Instant now = clock.instant();
    if (now.isAfter(token.expiresAt())) {
      AUDIT_LOGGER.info("event=password_reset_failed reason=expired");
      throw new TokenExpiredException("password reset token expired");
    }

    PasswordValidationResult validation = passwordService.validate(command.newPassword());
    if (!validation.isValid()) {
      throw passwordPolicyViolation(validation);
    }

    if (!tokenRepository.consume(token.id(), now)) {
      AUDIT_LOGGER.info("event=password_reset_failed reason=already_used");
      throw new TokenAlreadyUsedException("password reset token already used");
    }

    User user =
        userRepository
            .findById(token.userId())
            .orElseThrow(
                () -> new IllegalStateException("password reset token references no user"));
    Credential credential =
        credentialRepository
            .findByUserId(user.id())
            .orElseThrow(
                () -> new IllegalStateException("password reset token's user has no credential"));

    String newHash = passwordService.hash(command.newPassword());
    credentialRepository.save(credential.rehash(newHash, now));
    int revokedSessions = sessionRepository.revokeAllForUser(user.id(), now);

    mailPort.enqueue(
        user.id(),
        MailMessageKind.SECURITY_ALERT,
        MailRecipient.of(user.email().raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName", user.displayName(),
                "eventDescription", "Your password was changed.",
                "occurredAt", DateTimeFormatter.ISO_INSTANT.format(now))));

    AUDIT_LOGGER.info("event=password_reset_succeeded revokedSessions={}", revokedSessions);
  }

  private static FieldValidationException passwordPolicyViolation(
      PasswordValidationResult validation) {
    List<FieldProblem> errors =
        validation.violations().stream()
            .map(violation -> new FieldProblem("newPassword", violation.name()))
            .sorted(Comparator.comparing(FieldProblem::code))
            .toList();
    return new FieldValidationException("password does not meet policy", errors);
  }
}

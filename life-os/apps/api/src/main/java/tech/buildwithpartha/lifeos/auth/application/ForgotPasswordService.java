package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetRateLimiter;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

/**
 * Requests a password reset (LOS-0507): rate limit, and — only for an email that belongs to an
 * {@link AccountStatus#ACTIVE} account — issue a single-use {@link PasswordResetToken} and enqueue
 * the reset mail.
 *
 * <p>An unknown email, or one belonging to an account that is not yet verified, suspended, or
 * deleted, is not an error: {@link #request} returns normally either way, mirroring {@code
 * SignupService}'s own duplicate-email handling ({@code 06-SECURITY.md}: "Generic auth recovery
 * responses prevent account enumeration"). No token is created and no mail is enqueued for any of
 * those cases, but the caller cannot tell that from the API response — only, at most, from whether
 * mail eventually arrives, which is not observable through this endpoint.
 */
@Service
public class ForgotPasswordService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final PasswordResetRateLimiter rateLimiter;
  private final UserRepository userRepository;
  private final PasswordResetTokenRepository tokenRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final TransactionalMailPort mailPort;
  private final LifeOsEnvironmentProperties environmentProperties;
  private final Clock clock;

  public ForgotPasswordService(
      PasswordResetRateLimiter rateLimiter,
      UserRepository userRepository,
      PasswordResetTokenRepository tokenRepository,
      SecureTokenGenerator tokenGenerator,
      TransactionalMailPort mailPort,
      LifeOsEnvironmentProperties environmentProperties,
      Clock clock) {
    this.rateLimiter = rateLimiter;
    this.userRepository = userRepository;
    this.tokenRepository = tokenRepository;
    this.tokenGenerator = tokenGenerator;
    this.mailPort = mailPort;
    this.environmentProperties = environmentProperties;
    this.clock = clock;
  }

  @Transactional
  public void request(ForgotPasswordCommand command) {
    if (!rateLimiter.tryAcquire(command.clientAddress())) {
      throw new RateLimitedException("forgot-password rate limit exceeded");
    }

    EmailAddress email = EmailAddress.of(command.email());
    User user = userRepository.findByEmailNormalized(email.normalized()).orElse(null);
    if (user == null || user.accountStatus() != AccountStatus.ACTIVE) {
      AUDIT_LOGGER.info("event=forgot_password_unknown_or_inactive");
      return;
    }

    Instant now = clock.instant();
    RawToken token = tokenGenerator.generate();
    tokenRepository.save(PasswordResetToken.issue(UUID.randomUUID(), user.id(), token.hash(), now));

    String resetUrl = environmentProperties.publicUrl() + "/reset-password?token=" + token.value();
    mailPort.enqueue(
        user.id(),
        MailMessageKind.PASSWORD_RESET,
        MailRecipient.of(user.email().raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName", user.displayName(),
                "resetUrl", resetUrl,
                "expiresInMinutes", String.valueOf(PasswordResetToken.TTL.toMinutes()))));

    AUDIT_LOGGER.info("event=forgot_password_requested");
  }
}

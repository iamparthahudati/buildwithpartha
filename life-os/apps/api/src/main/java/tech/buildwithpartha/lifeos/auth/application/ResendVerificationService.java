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
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.ResendVerificationRateLimiter;
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
 * Requests resending an email verification link (LOS-0511): rate limit, and — only for an email
 * that belongs to an {@link AccountStatus#UNVERIFIED} account — issue a new single-use {@link
 * EmailVerificationToken} and enqueue the verification mail.
 *
 * <p>An unknown email, or one belonging to an account that is already active, suspended, or
 * deleted, is not an error: {@link #resend} returns normally either way, mirroring {@code
 * SignupService}'s own duplicate-email handling ({@code 06-SECURITY.md}: "Generic auth recovery
 * responses prevent account enumeration"). No token is created and no mail is enqueued for any of
 * those cases, preventing account enumeration.
 */
@Service
public class ResendVerificationService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final ResendVerificationRateLimiter rateLimiter;
  private final UserRepository userRepository;
  private final EmailVerificationTokenRepository tokenRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final TransactionalMailPort mailPort;
  private final LifeOsEnvironmentProperties environmentProperties;
  private final Clock clock;

  public ResendVerificationService(
      ResendVerificationRateLimiter rateLimiter,
      UserRepository userRepository,
      EmailVerificationTokenRepository tokenRepository,
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
  public void resend(ResendVerificationCommand command) {
    if (!rateLimiter.tryAcquire(command.clientAddress())) {
      throw new RateLimitedException("resend-verification rate limit exceeded");
    }

    EmailAddress email = EmailAddress.of(command.email());
    User user = userRepository.findByEmailNormalized(email.normalized()).orElse(null);
    if (user == null || user.accountStatus() != AccountStatus.UNVERIFIED) {
      AUDIT_LOGGER.info("event=resend_verification_unknown_or_active");
      return;
    }

    Instant now = clock.instant();
    RawToken token = tokenGenerator.generate();
    tokenRepository.save(
        EmailVerificationToken.issue(UUID.randomUUID(), user.id(), token.hash(), now));

    String verificationUrl =
        environmentProperties.publicUrl() + "/verify-email?token=" + token.value();
    mailPort.enqueue(
        user.id(),
        MailMessageKind.EMAIL_VERIFICATION,
        MailRecipient.of(user.email().raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName", user.displayName(),
                "verificationUrl", verificationUrl,
                "expiresInMinutes", String.valueOf(EmailVerificationToken.TTL.toMinutes()))));

    AUDIT_LOGGER.info("event=resend_verification_requested");
  }
}

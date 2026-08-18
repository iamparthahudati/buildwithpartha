package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.PasswordValidationResult;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.SignupRateLimiter;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

/**
 * Creates an unverified {@link User} from a signup request (LOS-0503): rate limit, validate the
 * password policy, create the account and its first credential transactionally, record terms and
 * privacy acceptance, issue a single-use email verification token, and enqueue the verification
 * mail through the same transaction ({@code TransactionalMailPort}'s {@code REQUIRED} propagation).
 *
 * <p>An email that already belongs to an account is not an error: {@link #signup} returns normally
 * either way, and the caller always renders the same generic response ({@code
 * 24-CRITICAL-USER-JOURNEYS.md}: "Duplicate/unknown account responses avoid enumeration"). No
 * second account, credential or mail is created for a duplicate.
 *
 * <p>"Audit" for this ticket is a structured log line on {@link #AUDIT_LOGGER}, following {@code
 * 31-PRIVACY-DATA-LIFECYCLE.md}'s allowed-fields list (event type, correlation id via MDC, the new
 * account id when one is created — never the raw email or password). {@code LOS-1404} owns the real
 * structured audit-event service this will move onto.
 */
@Service
public class SignupService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final SignupRateLimiter rateLimiter;
  private final PasswordService passwordService;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final TermsAcceptanceRepository termsAcceptanceRepository;
  private final EmailVerificationTokenRepository verificationTokenRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final TransactionalMailPort mailPort;
  private final LifeOsEnvironmentProperties environmentProperties;
  private final Clock clock;

  public SignupService(
      SignupRateLimiter rateLimiter,
      PasswordService passwordService,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      TermsAcceptanceRepository termsAcceptanceRepository,
      EmailVerificationTokenRepository verificationTokenRepository,
      SecureTokenGenerator tokenGenerator,
      TransactionalMailPort mailPort,
      LifeOsEnvironmentProperties environmentProperties,
      Clock clock) {
    this.rateLimiter = rateLimiter;
    this.passwordService = passwordService;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.termsAcceptanceRepository = termsAcceptanceRepository;
    this.verificationTokenRepository = verificationTokenRepository;
    this.tokenGenerator = tokenGenerator;
    this.mailPort = mailPort;
    this.environmentProperties = environmentProperties;
    this.clock = clock;
  }

  @Transactional
  public void signup(SignupCommand command) {
    if (!rateLimiter.tryAcquire(command.clientAddress())) {
      throw new RateLimitedException("signup rate limit exceeded");
    }

    EmailAddress email = EmailAddress.of(command.email());
    String displayName = command.displayName().strip();

    PasswordValidationResult validation = passwordService.validate(command.rawPassword());
    if (!validation.isValid()) {
      throw passwordPolicyViolation(validation);
    }

    Instant now = clock.instant();

    if (userRepository.existsByEmailNormalized(email.normalized())) {
      AUDIT_LOGGER.info("event=signup_duplicate");
      return;
    }

    UUID userId = UUID.randomUUID();
    userRepository.save(User.signup(userId, email, displayName, now));

    String passwordHash = passwordService.hash(command.rawPassword());
    credentialRepository.save(Credential.issue(UUID.randomUUID(), userId, passwordHash, now));

    Optional<String> ipSource = Optional.of(command.clientAddress());
    termsAcceptanceRepository.save(
        TermsAcceptance.termsAccepted(
            UUID.randomUUID(), userId, command.termsVersion(), now, ipSource));
    termsAcceptanceRepository.save(
        TermsAcceptance.privacyAcknowledged(
            UUID.randomUUID(), userId, command.privacyVersion(), now, ipSource));

    RawToken token = tokenGenerator.generate();
    verificationTokenRepository.save(
        EmailVerificationToken.issue(UUID.randomUUID(), userId, token.hash(), now));

    enqueueVerificationMail(userId, email, displayName, token);

    AUDIT_LOGGER.info("event=signup_succeeded");
  }

  private void enqueueVerificationMail(
      UUID userId, EmailAddress email, String displayName, RawToken token) {
    String verificationUrl =
        environmentProperties.publicUrl() + "/verify-email?token=" + token.value();
    mailPort.enqueue(
        userId,
        MailMessageKind.EMAIL_VERIFICATION,
        MailRecipient.of(email.raw()),
        MailTemplateVariables.of(
            Map.of(
                "displayName", displayName,
                "verificationUrl", verificationUrl,
                "expiresInMinutes", String.valueOf(EmailVerificationToken.TTL.toMinutes()))));
  }

  private static FieldValidationException passwordPolicyViolation(
      PasswordValidationResult validation) {
    List<FieldProblem> errors =
        validation.violations().stream()
            .map(violation -> new FieldProblem("password", violation.name()))
            .sorted(Comparator.comparing(FieldProblem::code))
            .toList();
    return new FieldValidationException("password does not meet policy", errors);
  }
}

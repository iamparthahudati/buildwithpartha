package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.LoginRateLimiter;
import tech.buildwithpartha.lifeos.auth.domain.PasswordVerification;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.InvalidCredentialsException;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;

/**
 * Authenticates a verified, active user and issues a fresh {@link Session} (LOS-0505).
 *
 * <p>Every rejection reason — no account with that email, an account that exists but is not {@link
 * AccountStatus#ACTIVE}, or a password that does not match — throws the exact same {@link
 * InvalidCredentialsException} with the exact same message. This is not an oversight: {@code
 * 06-SECURITY.md}'s "Generic auth recovery responses prevent account enumeration" applies to login
 * exactly like it applies to signup's duplicate-email case, and a caller who could distinguish
 * "wrong password" from "no such account" from "not yet verified" could use login itself to probe
 * which emails have accounts.
 *
 * <p>A session is always newly minted, never reused or extended — the session-fixation defense the
 * ticket's acceptance contract names. Nothing here reads an incoming session cookie at all;
 * whatever the caller presented (if anything) is simply irrelevant to what this method issues.
 *
 * <p>The rehash-on-login path LOS-0502 built ({@code PasswordAuthenticationService.verify}) is
 * applied in the same transaction as everything else: a successful login with a weaker-than-current
 * stored hash persists the replacement hash before returning.
 */
@Service
public class LoginService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final LoginRateLimiter rateLimiter;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final PasswordAuthenticationService passwordAuthenticationService;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;

  public LoginService(
      LoginRateLimiter rateLimiter,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      PasswordAuthenticationService passwordAuthenticationService,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      Clock clock) {
    this.rateLimiter = rateLimiter;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.passwordAuthenticationService = passwordAuthenticationService;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
  }

  @Transactional
  public LoginResult login(LoginCommand command) {
    if (!rateLimiter.tryAcquire(command.clientAddress())) {
      throw new RateLimitedException("login rate limit exceeded");
    }

    EmailAddress email = EmailAddress.of(command.email());
    User user =
        userRepository
            .findByEmailNormalized(email.normalized())
            .filter(candidate -> candidate.accountStatus() == AccountStatus.ACTIVE)
            .orElseThrow(this::invalidCredentials);

    Credential credential =
        credentialRepository.findByUserId(user.id()).orElseThrow(this::invalidCredentials);

    PasswordVerification verification =
        passwordAuthenticationService.verify(command.rawPassword(), credential.passwordHash());
    if (!verification.matched()) {
      throw invalidCredentials();
    }

    Instant now = clock.instant();
    verification
        .rehashedHash()
        .ifPresent(newHash -> credentialRepository.save(credential.rehash(newHash, now)));

    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            user.id(),
            sessionToken.hash(),
            csrfToken.hash(),
            now,
            command.deviceHint()));

    AUDIT_LOGGER.info("event=login_succeeded");
    return new LoginResult(user, sessionToken, csrfToken);
  }

  private InvalidCredentialsException invalidCredentials() {
    AUDIT_LOGGER.info("event=login_failed reason=invalid_credentials");
    return new InvalidCredentialsException("invalid email or password");
  }
}

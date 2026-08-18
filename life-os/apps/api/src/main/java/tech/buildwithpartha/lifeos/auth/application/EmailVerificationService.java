package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.TokenAlreadyUsedException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.error.TokenInvalidException;

/**
 * Consumes a single-use {@link EmailVerificationToken} (LOS-0503 issues it) and activates the
 * account it belongs to (LOS-0504).
 *
 * <p>{@link EmailVerificationTokenRepository#consume} is a single conditional {@code UPDATE ...
 * WHERE consumed_at IS NULL}, not a read-then-write from this service: two concurrent requests
 * presenting the same still-valid token both read an unconsumed row, but only one {@code consume}
 * call can win the race, and the loser is treated exactly like a token someone already used. That
 * is what makes {@link #verify} activate the account at most once per token — the acceptance
 * contract's "does not create unintended parallel accounts/sessions" guarantee.
 *
 * <p>Expiry is checked before attempting to consume, so an expired token is left unconsumed rather
 * than marked as used — expired and already-used stay distinguishable outcomes, matching {@code
 * 24-CRITICAL-USER-JOURNEYS.md}'s "Expired/used verification links offer safe resend/login paths"
 * (each needs its own recovery copy on the screens LOS-0511 builds).
 *
 * <p>"Audit" for this ticket follows the same {@link #AUDIT_LOGGER} convention {@code
 * SignupService} established: event type and a safe failure reason only, never the token value or
 * the account's email.
 */
@Service
public class EmailVerificationService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final EmailVerificationTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;

  public EmailVerificationService(
      EmailVerificationTokenRepository tokenRepository,
      UserRepository userRepository,
      SecureTokenGenerator tokenGenerator,
      Clock clock) {
    this.tokenRepository = tokenRepository;
    this.userRepository = userRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
  }

  @Transactional
  public void verify(VerifyEmailCommand command) {
    String tokenHash = tokenGenerator.hash(command.token());
    EmailVerificationToken token =
        tokenRepository.findByTokenHash(tokenHash).orElseThrow(this::invalid);

    if (token.consumedAt().isPresent()) {
      throw alreadyUsed();
    }

    Instant now = clock.instant();
    if (now.isAfter(token.expiresAt())) {
      AUDIT_LOGGER.info("event=email_verification_failed reason=expired");
      throw new TokenExpiredException("verification token expired");
    }

    if (!tokenRepository.consume(token.id(), now)) {
      throw alreadyUsed();
    }

    User user =
        userRepository
            .findById(token.userId())
            .orElseThrow(() -> new IllegalStateException("verification token references no user"));
    userRepository.save(user.verify(now));

    AUDIT_LOGGER.info("event=email_verification_succeeded");
  }

  private TokenInvalidException invalid() {
    AUDIT_LOGGER.info("event=email_verification_failed reason=invalid");
    return new TokenInvalidException("verification token not found");
  }

  private TokenAlreadyUsedException alreadyUsed() {
    AUDIT_LOGGER.info("event=email_verification_failed reason=already_used");
    return new TokenAlreadyUsedException("verification token already used");
  }
}

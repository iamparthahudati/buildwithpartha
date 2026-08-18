package tech.buildwithpartha.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.application.ForgotPasswordCommand;
import tech.buildwithpartha.lifeos.auth.application.ForgotPasswordService;
import tech.buildwithpartha.lifeos.auth.application.ResetPasswordCommand;
import tech.buildwithpartha.lifeos.auth.application.ResetPasswordService;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Proves Spring wires the real JPA repositories, {@code Sha256SecureTokenGenerator} and the
 * cross-domain mail outbox into both {@link ForgotPasswordService} and {@link
 * ResetPasswordService}, matching {@code SignupWiringIT}'s (LOS-0503) precedent.
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class PasswordResetWiringIT {

  private static final String OLD_PASSWORD = "a genuinely unusual passphrase 2026";
  private static final String NEW_PASSWORD = "a genuinely unusual replacement passphrase 2026";

  private final ForgotPasswordService forgotPasswordService;
  private final ResetPasswordService resetPasswordService;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final PasswordResetTokenRepository tokenRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordHasher passwordHasher;

  @Autowired
  PasswordResetWiringIT(
      ForgotPasswordService forgotPasswordService,
      ResetPasswordService resetPasswordService,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      PasswordResetTokenRepository tokenRepository,
      SecureTokenGenerator tokenGenerator,
      PasswordHasher passwordHasher) {
    this.forgotPasswordService = forgotPasswordService;
    this.resetPasswordService = resetPasswordService;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.tokenRepository = tokenRepository;
    this.tokenGenerator = tokenGenerator;
    this.passwordHasher = passwordHasher;
  }

  @Test
  void wiresForgotPasswordEndToEndWithoutThrowing() {
    Instant now = Instant.now();
    String email = "wiring-forgot-" + UUID.randomUUID() + "@example.test";
    userRepository.save(
        User.signup(UUID.randomUUID(), EmailAddress.of(email), "Wiring Forgot User", now)
            .verify(now));

    forgotPasswordService.request(new ForgotPasswordCommand(email, "203.0.113.1"));
  }

  @Test
  void wiresResetPasswordEndToEndAndPersistsTheNewHash() {
    Instant now = Instant.now();
    User user =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("wiring-reset-" + UUID.randomUUID() + "@example.test"),
                    "Wiring Reset User",
                    now)
                .verify(now));
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(), user.id(), passwordHasher.hash(RawPassword.of(OLD_PASSWORD)), now));
    RawToken token = tokenGenerator.generate();
    tokenRepository.save(PasswordResetToken.issue(UUID.randomUUID(), user.id(), token.hash(), now));

    resetPasswordService.reset(
        new ResetPasswordCommand(token.value(), RawPassword.of(NEW_PASSWORD)));

    String updatedHash = credentialRepository.findByUserId(user.id()).orElseThrow().passwordHash();
    assertThat(passwordHasher.matches(RawPassword.of(NEW_PASSWORD), updatedHash)).isTrue();
  }
}

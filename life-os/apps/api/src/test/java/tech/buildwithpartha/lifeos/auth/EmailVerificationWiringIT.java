package tech.buildwithpartha.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.application.EmailVerificationService;
import tech.buildwithpartha.lifeos.auth.application.VerifyEmailCommand;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Proves Spring wires the real JPA repositories and {@code Sha256SecureTokenGenerator} into {@link
 * EmailVerificationService}, not only that the fakes used by {@code EmailVerificationServiceTests}
 * behave, matching {@code SignupWiringIT}'s (LOS-0503) precedent.
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class EmailVerificationWiringIT {

  private final EmailVerificationService emailVerificationService;
  private final UserRepository userRepository;
  private final EmailVerificationTokenRepository tokenRepository;
  private final SecureTokenGenerator tokenGenerator;

  @Autowired
  EmailVerificationWiringIT(
      EmailVerificationService emailVerificationService,
      UserRepository userRepository,
      EmailVerificationTokenRepository tokenRepository,
      SecureTokenGenerator tokenGenerator) {
    this.emailVerificationService = emailVerificationService;
    this.userRepository = userRepository;
    this.tokenRepository = tokenRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @Test
  void wiresTheRealAdaptersEndToEndAndActivatesTheAccount() {
    Instant now = Instant.now();
    User user =
        userRepository.save(
            User.signup(
                UUID.randomUUID(),
                EmailAddress.of("wiring-" + UUID.randomUUID() + "@example.test"),
                "Wiring Test User",
                now));
    RawToken token = tokenGenerator.generate();
    tokenRepository.save(
        new EmailVerificationToken(
            UUID.randomUUID(),
            user.id(),
            token.hash(),
            now.plus(EmailVerificationToken.TTL),
            Optional.empty(),
            now));

    emailVerificationService.verify(new VerifyEmailCommand(token.value()));

    assertThat(userRepository.findById(user.id()).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.ACTIVE);
  }
}

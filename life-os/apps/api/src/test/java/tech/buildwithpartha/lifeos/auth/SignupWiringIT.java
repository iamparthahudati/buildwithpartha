package tech.buildwithpartha.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.application.SignupCommand;
import tech.buildwithpartha.lifeos.auth.application.SignupService;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Proves Spring wires the real JPA repositories, {@code Sha256SecureTokenGenerator}, {@code
 * InMemorySignupRateLimiter}, and the cross-domain {@code TransactionalMailPort} adapter into
 * {@link SignupService}, not only that the fakes used by {@code SignupServiceTests} behave.
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class SignupWiringIT {

  private final SignupService signupService;
  private final UserRepository userRepository;

  @Autowired
  SignupWiringIT(SignupService signupService, UserRepository userRepository) {
    this.signupService = signupService;
    this.userRepository = userRepository;
  }

  @Test
  void wiresTheRealAdaptersEndToEndAndPersistsAnAccount() {
    String email = "wiring-" + UUID.randomUUID() + "@example.test";

    signupService.signup(
        new SignupCommand(
            email,
            RawPassword.of("a genuinely unusual passphrase 2026"),
            "Wiring Test User",
            "2026-08-01",
            "2026-08-01",
            "203.0.113.1"));

    assertThat(userRepository.existsByEmailNormalized(email)).isTrue();
  }
}

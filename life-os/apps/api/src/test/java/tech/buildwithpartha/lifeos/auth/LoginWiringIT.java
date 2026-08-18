package tech.buildwithpartha.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.application.LoginCommand;
import tech.buildwithpartha.lifeos.auth.application.LoginResult;
import tech.buildwithpartha.lifeos.auth.application.LoginService;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Proves Spring wires the real JPA repositories, {@code Argon2PasswordHasher} and {@code
 * Sha256SecureTokenGenerator} into {@link LoginService}, not only that the fakes used by {@code
 * LoginServiceTests} behave, matching {@code SignupWiringIT}'s (LOS-0503) precedent.
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class LoginWiringIT {

  private static final String PASSWORD = "a genuinely unusual passphrase 2026";

  private final LoginService loginService;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final SessionRepository sessionRepository;
  private final PasswordHasher passwordHasher;

  @Autowired
  LoginWiringIT(
      LoginService loginService,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      SessionRepository sessionRepository,
      PasswordHasher passwordHasher) {
    this.loginService = loginService;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.sessionRepository = sessionRepository;
    this.passwordHasher = passwordHasher;
  }

  @Test
  void wiresTheRealAdaptersEndToEndAndIssuesAPersistedSession() {
    Instant now = Instant.now();
    String email = "wiring-" + UUID.randomUUID() + "@example.test";
    User user =
        userRepository.save(
            User.signup(UUID.randomUUID(), EmailAddress.of(email), "Wiring Test User", now)
                .verify(now));
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(), user.id(), passwordHasher.hash(RawPassword.of(PASSWORD)), now));

    LoginResult result =
        loginService.login(
            new LoginCommand(email, RawPassword.of(PASSWORD), "203.0.113.1", Optional.empty()));

    assertThat(result.user().id()).isEqualTo(user.id());
    assertThat(sessionRepository.findByTokenHash(result.sessionToken().hash())).isPresent();
  }
}

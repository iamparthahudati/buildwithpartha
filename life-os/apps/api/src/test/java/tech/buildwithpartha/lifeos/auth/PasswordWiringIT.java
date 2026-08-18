package tech.buildwithpartha.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.application.PasswordAuthenticationService;
import tech.buildwithpartha.lifeos.auth.application.PasswordService;
import tech.buildwithpartha.lifeos.auth.domain.PasswordValidationResult;
import tech.buildwithpartha.lifeos.auth.domain.PasswordVerification;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/**
 * Proves Spring wires the real Argon2id and wordlist adapters from {@code auth.infrastructure} into
 * the application services, not only that the fakes used by the unit tests behave.
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class PasswordWiringIT {

  private final PasswordService passwordService;
  private final PasswordAuthenticationService passwordAuthenticationService;

  @Autowired
  PasswordWiringIT(
      PasswordService passwordService,
      PasswordAuthenticationService passwordAuthenticationService) {
    this.passwordService = passwordService;
    this.passwordAuthenticationService = passwordAuthenticationService;
  }

  @Test
  void wiresTheRealArgon2AndWordlistAdaptersEndToEnd() {
    RawPassword weak = RawPassword.of("password123");
    PasswordValidationResult weakResult = passwordService.validate(weak);
    assertThat(weakResult.isValid()).isFalse();

    RawPassword strong = RawPassword.of("a genuinely unusual passphrase 2026");
    assertThat(passwordService.validate(strong).isValid()).isTrue();

    String storedHash = passwordService.hash(strong);
    assertThat(storedHash).startsWith("$argon2id$");

    PasswordVerification verification = passwordAuthenticationService.verify(strong, storedHash);
    assertThat(verification.matched()).isTrue();
    assertThat(verification.rehashedHash()).isEmpty();
  }
}

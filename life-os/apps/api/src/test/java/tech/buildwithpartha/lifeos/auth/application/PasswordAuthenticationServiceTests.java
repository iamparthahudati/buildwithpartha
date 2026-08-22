package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.PasswordVerification;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

class PasswordAuthenticationServiceTests {

  private final FakePasswordHasher hasher = new FakePasswordHasher();
  private final PasswordAuthenticationService service = new PasswordAuthenticationService(hasher);

  @Test
  void reportsFailureWithoutARehashWhenThePasswordIsWrong() {
    RawPassword correct = RawPassword.of("correct horse battery staple");
    String storedHash = hasher.hash(correct);

    PasswordVerification verification =
        service.verify(RawPassword.of("a wrong password"), storedHash);

    assertThat(verification.matched()).isFalse();
    assertThat(verification.rehashedHash()).isEmpty();
  }

  @Test
  void reportsAMatchWithNoRehashWhenTheStoredHashIsAlreadyCurrent() {
    RawPassword password = RawPassword.of("correct horse battery staple");
    String storedHash = hasher.hash(password);

    PasswordVerification verification = service.verify(password, storedHash);

    assertThat(verification.matched()).isTrue();
    assertThat(verification.rehashedHash()).isEmpty();
  }

  @Test
  void rehashesOnLoginWhenTheStoredHashIsOutdated() {
    RawPassword password = RawPassword.of("correct horse battery staple");
    String legacyHash = FakePasswordHasher.legacyHashFor(password);

    PasswordVerification verification = service.verify(password, legacyHash);

    assertThat(verification.matched()).isTrue();
    assertThat(verification.rehashedHash()).contains(hasher.hash(password));
    // The replacement hash is itself current, so a second login would not rehash again.
    assertThat(hasher.needsRehash(verification.rehashedHash().orElseThrow())).isFalse();
  }
}

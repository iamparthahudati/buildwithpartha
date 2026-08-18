package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.Optional;
import org.junit.jupiter.api.Test;

class PasswordVerificationTests {

  @Test
  void failedCarriesNoRehash() {
    PasswordVerification verification = PasswordVerification.failed();

    assertThat(verification.matched()).isFalse();
    assertThat(verification.rehashedHash()).isEmpty();
  }

  @Test
  void matchedCarriesNoRehashByDefault() {
    PasswordVerification verification = PasswordVerification.success();

    assertThat(verification.matched()).isTrue();
    assertThat(verification.rehashedHash()).isEmpty();
  }

  @Test
  void matchedWithRehashCarriesTheReplacementHash() {
    PasswordVerification verification = PasswordVerification.matchedWithRehash("new-hash");

    assertThat(verification.matched()).isTrue();
    assertThat(verification.rehashedHash()).contains("new-hash");
  }

  @Test
  void rejectsARehashOnAFailedVerification() {
    assertThatIllegalArgumentException()
        .isThrownBy(() -> new PasswordVerification(false, Optional.of("new-hash")));
  }
}

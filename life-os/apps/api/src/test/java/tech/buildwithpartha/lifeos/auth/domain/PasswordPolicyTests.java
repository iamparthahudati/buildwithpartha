package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;

class PasswordPolicyTests {

  @Test
  void acceptsAPasswordWithinBounds() {
    RawPassword password = RawPassword.of("a".repeat(PasswordPolicy.MIN_LENGTH));

    assertThat(PasswordPolicy.checkLength(password)).isEmpty();
  }

  @Test
  void flagsAPasswordShorterThanTheMinimum() {
    RawPassword password = RawPassword.of("a".repeat(PasswordPolicy.MIN_LENGTH - 1));

    assertThat(PasswordPolicy.checkLength(password))
        .containsExactly(PasswordPolicyViolation.TOO_SHORT);
  }

  @Test
  void flagsAnEmptyPasswordAsTooShort() {
    assertThat(PasswordPolicy.checkLength(RawPassword.of("")))
        .containsExactly(PasswordPolicyViolation.TOO_SHORT);
  }

  @Test
  void flagsAPasswordLongerThanTheMaximum() {
    RawPassword password = RawPassword.of("a".repeat(PasswordPolicy.MAX_LENGTH + 1));

    assertThat(PasswordPolicy.checkLength(password))
        .containsExactly(PasswordPolicyViolation.TOO_LONG);
  }

  @Test
  void acceptsThePasswordExactlyAtTheMaximum() {
    RawPassword password = RawPassword.of("a".repeat(PasswordPolicy.MAX_LENGTH));

    assertThat(PasswordPolicy.checkLength(password)).isEmpty();
  }

  @Test
  void validationResultReportsValidityFromItsViolations() {
    assertThat(PasswordValidationResult.valid().isValid()).isTrue();
    assertThat(PasswordValidationResult.of(Set.of(PasswordPolicyViolation.TOO_SHORT)).isValid())
        .isFalse();
  }
}

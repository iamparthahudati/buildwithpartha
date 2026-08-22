package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.PasswordPolicy;
import tech.buildwithpartha.lifeos.auth.domain.PasswordPolicyViolation;
import tech.buildwithpartha.lifeos.auth.domain.PasswordValidationResult;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

class PasswordServiceTests {

  @Test
  void acceptsAPasswordThatIsLongEnoughAndNotCommon() {
    PasswordService service =
        new PasswordService(new FakeCommonPasswordChecker(Set.of()), new FakePasswordHasher());

    PasswordValidationResult result =
        service.validate(RawPassword.of("a".repeat(PasswordPolicy.MIN_LENGTH)));

    assertThat(result.isValid()).isTrue();
  }

  @Test
  void combinesLengthAndCommonExposureViolationsInOneResult() {
    RawPassword shortCommonPassword = RawPassword.of("short");
    PasswordService service =
        new PasswordService(
            new FakeCommonPasswordChecker(Set.of(shortCommonPassword.value())),
            new FakePasswordHasher());

    PasswordValidationResult result = service.validate(shortCommonPassword);

    assertThat(result.isValid()).isFalse();
    assertThat(result.violations())
        .containsExactlyInAnyOrder(
            PasswordPolicyViolation.TOO_SHORT, PasswordPolicyViolation.COMMONLY_EXPOSED);
  }

  @Test
  void delegatesHashingToThePasswordHasherPort() {
    FakePasswordHasher fakeHasher = new FakePasswordHasher();
    PasswordService service =
        new PasswordService(new FakeCommonPasswordChecker(Set.of()), fakeHasher);
    RawPassword password = RawPassword.of("a".repeat(PasswordPolicy.MIN_LENGTH));

    String hash = service.hash(password);

    assertThat(hash).isEqualTo(fakeHasher.hash(password));
  }
}

package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import org.junit.jupiter.api.Test;

class RawPasswordTests {

  private static final String SECRET_VALUE = "correct horse battery staple";

  @Test
  void exposesTheRawValueAndItsLength() {
    RawPassword password = RawPassword.of(SECRET_VALUE);

    assertThat(password.value()).isEqualTo(SECRET_VALUE);
    assertThat(password.length()).isEqualTo(SECRET_VALUE.length());
  }

  @Test
  void toStringNeverRevealsTheRawValue() {
    RawPassword password = RawPassword.of(SECRET_VALUE);

    String rendered = password.toString();

    assertThat(rendered).doesNotContain(SECRET_VALUE);
    assertThat(rendered).isEqualTo("RawPassword[REDACTED]");
  }

  @Test
  void anAssertionFailureMessageDoesNotLeakTheRawValueEither() {
    RawPassword password = RawPassword.of(SECRET_VALUE);

    // AssertJ renders the actual/expected objects via toString() in a failure message; proving
    // a deliberately failing comparison's message stays clean is the direct evidence that
    // ordinary test failures never print a raw secret to CI logs or a developer's terminal.
    String failureMessage = "";
    try {
      assertThat(password).isEqualTo(RawPassword.of("a different secret"));
    } catch (AssertionError e) {
      failureMessage = e.getMessage();
    }

    assertThat(failureMessage).doesNotContain(SECRET_VALUE);
    assertThat(failureMessage).doesNotContain("a different secret");
  }

  @Test
  void equalityIsBasedOnValue() {
    assertThat(RawPassword.of(SECRET_VALUE)).isEqualTo(RawPassword.of(SECRET_VALUE));
    assertThat(RawPassword.of(SECRET_VALUE)).isNotEqualTo(RawPassword.of("something else"));
  }

  @Test
  void rejectsNullInput() {
    assertThatNullPointerException()
        .isThrownBy(() -> RawPassword.of(null))
        .withMessage("value must not be null");
  }
}

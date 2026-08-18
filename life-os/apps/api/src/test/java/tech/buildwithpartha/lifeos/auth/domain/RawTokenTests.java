package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class RawTokenTests {

  @Test
  void toStringNeverIncludesTheRawValue() {
    RawToken token = RawToken.of("super-secret-raw-value", "sha256:digest");

    assertThat(token.toString())
        .doesNotContain("super-secret-raw-value")
        .contains("sha256:digest")
        .contains("REDACTED");
  }

  @Test
  void equalityIsByValueAndHash() {
    assertThat(RawToken.of("v", "h")).isEqualTo(RawToken.of("v", "h"));
    assertThat(RawToken.of("v", "h")).isNotEqualTo(RawToken.of("v", "different-hash"));
  }

  @Test
  void rejectsBlankValueOrHash() {
    assertThatThrownBy(() -> RawToken.of("", "hash")).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> RawToken.of("value", "")).isInstanceOf(IllegalArgumentException.class);
  }
}

package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RawPasswordTests {

  @Test
  @DisplayName("RawPassword redacts toString and supports equals/hashCode")
  void testRawPassword() {
    RawPassword pwd1 = RawPassword.of("Secret123!");
    RawPassword pwd2 = RawPassword.of("Secret123!");
    RawPassword pwd3 = RawPassword.of("Different123!");

    assertThat(pwd1.value()).isEqualTo("Secret123!");
    assertThat(pwd1.length()).isEqualTo(10);
    assertThat(pwd1.toString()).isEqualTo("RawPassword[REDACTED]");

    assertThat(pwd1).isEqualTo(pwd1);
    assertThat(pwd1).isEqualTo(pwd2);
    assertThat(pwd1).isNotEqualTo(pwd3);
    assertThat(pwd1).isNotEqualTo("Secret123!");
    assertThat(pwd1).isNotEqualTo(null);

    assertThat(pwd1.hashCode()).isEqualTo(pwd2.hashCode());

    assertThatThrownBy(() -> RawPassword.of(null)).isInstanceOf(NullPointerException.class);
  }
}

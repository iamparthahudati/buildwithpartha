package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import org.junit.jupiter.api.Test;

class EmailAddressTests {

  @Test
  void keepsTheOriginalFormAndLowerCasesTheNormalizedForm() {
    EmailAddress email = EmailAddress.of("  Ada.Lovelace@Example.COM  ");

    assertThat(email.raw()).isEqualTo("Ada.Lovelace@Example.COM");
    assertThat(email.normalized()).isEqualTo("ada.lovelace@example.com");
  }

  @Test
  void treatsUnicodeEquivalentFormsAsTheSameNormalizedEmail() {
    // "é" is the precomposed code point for e-with-acute; "é" is the
    // same visible character spelled as "e" plus a combining acute accent. They
    // render identically but compare unequal as raw strings until NFC-normalized.
    String precomposedLocalPart = "café";
    String decomposedLocalPart = "café";
    assertThat(precomposedLocalPart).isNotEqualTo(decomposedLocalPart);

    EmailAddress precomposed = EmailAddress.of(precomposedLocalPart + "@example.com");
    EmailAddress decomposed = EmailAddress.of(decomposedLocalPart + "@example.com");

    assertThat(precomposed.normalized()).isEqualTo(decomposed.normalized());
    assertThat(precomposed.normalized()).isEqualTo("café@example.com");
  }

  @Test
  void rejectsBlankOrNullInput() {
    assertThatIllegalArgumentException().isThrownBy(() -> EmailAddress.of("   "));
    assertThatNullPointerException()
        .isThrownBy(() -> EmailAddress.of(null))
        .withMessage("rawEmail must not be null");
  }
}

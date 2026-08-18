package tech.buildwithpartha.lifeos.common.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class MailRecipientTests {

  @Test
  void storesTheGivenEmail() {
    MailRecipient recipient = MailRecipient.of("user@example.test");

    assertThat(recipient.email()).isEqualTo("user@example.test");
  }

  @Test
  void rejectsANullEmail() {
    assertThatThrownBy(() -> new MailRecipient(null)).isInstanceOf(NullPointerException.class);
  }

  @Test
  void rejectsABlankEmail() {
    assertThatThrownBy(() -> MailRecipient.of("   ")).isInstanceOf(IllegalArgumentException.class);
  }
}

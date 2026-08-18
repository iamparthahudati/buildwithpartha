package tech.buildwithpartha.lifeos.common.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MailTemplateVariablesTests {

  @Test
  void toStringNeverIncludesTheRawValues() {
    MailTemplateVariables variables =
        MailTemplateVariables.of(
            Map.of("verificationUrl", "https://lifeos.example.test/t/super-secret-token"));

    assertThat(variables.toString())
        .doesNotContain("super-secret-token")
        .isEqualTo("MailTemplateVariables[REDACTED, 1 entries]");
  }

  @Test
  void mutatingTheSourceMapAfterConstructionDoesNotLeakIn() {
    Map<String, String> source = new HashMap<>(Map.of("key", "original"));
    MailTemplateVariables variables = MailTemplateVariables.of(source);

    source.put("key", "mutated");

    assertThat(variables.asMap()).containsEntry("key", "original");
  }

  @Test
  void asMapIsUnmodifiable() {
    MailTemplateVariables variables = MailTemplateVariables.of(Map.of("key", "value"));

    assertThatThrownBy(() -> variables.asMap().put("other", "value"))
        .isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void emptyHasNoEntries() {
    assertThat(MailTemplateVariables.empty().asMap()).isEmpty();
  }

  @Test
  void rejectsANullMap() {
    assertThatThrownBy(() -> MailTemplateVariables.of(null))
        .isInstanceOf(NullPointerException.class);
  }
}

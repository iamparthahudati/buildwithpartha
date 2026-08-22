package tech.buildwithpartha.lifeos.label.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LabelDomainTests {

  @Test
  void normalizeName_trimsAndLowercases() {
    assertThat(Label.normalizeName("  Work Label  ")).isEqualTo("work label");
    assertThatThrownBy(() -> Label.normalizeName(null)).isInstanceOf(NullPointerException.class);
  }

  @Test
  void constructor_validatesNameAndColor() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();

    assertThatThrownBy(() -> new Label(id, userId, "   ", "   ", "#000", now, now, 0L))
        .isInstanceOf(IllegalArgumentException.class);

    assertThatThrownBy(
            () ->
                new Label(
                    id,
                    userId,
                    "Work",
                    "work",
                    "color-string-that-exceeds-thirty-character-limit-for-validation",
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void labelRecordProperties_matchConstructorInputs() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();

    Label label = new Label(id, userId, "Work", "work", "#FF0000", now, now, 1L);

    assertThat(label.id()).isEqualTo(id);
    assertThat(label.userId()).isEqualTo(userId);
    assertThat(label.name()).isEqualTo("Work");
    assertThat(label.nameNormalized()).isEqualTo("work");
    assertThat(label.color()).isEqualTo("#FF0000");
    assertThat(label.version()).isEqualTo(1L);
  }
}

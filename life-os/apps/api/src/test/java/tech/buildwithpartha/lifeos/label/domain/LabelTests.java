package tech.buildwithpartha.lifeos.label.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LabelTests {

  @Test
  void successfulLabelCreation() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();

    Label label = new Label(id, userId, "Work Label", "work label", "red", now, now, 0L);

    assertThat(label.id()).isEqualTo(id);
    assertThat(label.userId()).isEqualTo(userId);
    assertThat(label.name()).isEqualTo("Work Label");
    assertThat(label.nameNormalized()).isEqualTo("work label");
    assertThat(label.color()).isEqualTo("red");
    assertThat(label.createdAt()).isEqualTo(now);
    assertThat(label.updatedAt()).isEqualTo(now);
    assertThat(label.version()).isZero();
  }
}

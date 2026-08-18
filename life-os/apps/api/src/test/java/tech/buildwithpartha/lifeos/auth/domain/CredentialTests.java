package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CredentialTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void issueStampsAllTimestampsToNow() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    Credential credential = Credential.issue(id, userId, "$argon2id$hash", NOW);

    assertThat(credential.id()).isEqualTo(id);
    assertThat(credential.userId()).isEqualTo(userId);
    assertThat(credential.passwordHash()).isEqualTo("$argon2id$hash");
    assertThat(credential.changedAt()).isEqualTo(NOW);
    assertThat(credential.createdAt()).isEqualTo(NOW);
    assertThat(credential.updatedAt()).isEqualTo(NOW);
  }

  @Test
  void rejectsABlankPasswordHash() {
    assertThatThrownBy(() -> Credential.issue(UUID.randomUUID(), UUID.randomUUID(), " ", NOW))
        .isInstanceOf(IllegalArgumentException.class);
  }
}

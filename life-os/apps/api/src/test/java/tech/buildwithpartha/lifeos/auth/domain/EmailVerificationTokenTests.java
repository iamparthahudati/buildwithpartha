package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EmailVerificationTokenTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void issueExpiresAfterTheTtlAndStartsUnconsumed() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    EmailVerificationToken token = EmailVerificationToken.issue(id, userId, "sha256:abc", NOW);

    assertThat(token.id()).isEqualTo(id);
    assertThat(token.userId()).isEqualTo(userId);
    assertThat(token.tokenHash()).isEqualTo("sha256:abc");
    assertThat(token.expiresAt()).isEqualTo(NOW.plus(EmailVerificationToken.TTL));
    assertThat(token.consumedAt()).isEmpty();
    assertThat(token.createdAt()).isEqualTo(NOW);
  }

  @Test
  void rejectsABlankTokenHash() {
    assertThatThrownBy(
            () -> EmailVerificationToken.issue(UUID.randomUUID(), UUID.randomUUID(), "", NOW))
        .isInstanceOf(IllegalArgumentException.class);
  }
}

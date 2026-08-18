package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PasswordResetTokenTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void issueExpiresAfterTheTtlAndStartsUnconsumed() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    PasswordResetToken token = PasswordResetToken.issue(id, userId, "sha256:abc", NOW);

    assertThat(token.id()).isEqualTo(id);
    assertThat(token.userId()).isEqualTo(userId);
    assertThat(token.tokenHash()).isEqualTo("sha256:abc");
    assertThat(token.expiresAt()).isEqualTo(NOW.plus(PasswordResetToken.TTL));
    assertThat(token.consumedAt()).isEmpty();
    assertThat(token.createdAt()).isEqualTo(NOW);
  }

  @Test
  void ttlIsShorterThanEmailVerificationsTtl() {
    assertThat(PasswordResetToken.TTL).isLessThan(EmailVerificationToken.TTL);
  }

  @Test
  void rejectsABlankTokenHash() {
    assertThatThrownBy(
            () -> PasswordResetToken.issue(UUID.randomUUID(), UUID.randomUUID(), " ", NOW))
        .isInstanceOf(IllegalArgumentException.class);
  }
}

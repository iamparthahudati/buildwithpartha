package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SessionTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void issueStampsCreatedAndLastSeenToNowAndExpiresAfterTheTtl() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    Session session =
        Session.issue(id, userId, "sha256:token", "sha256:csrf", NOW, Optional.of("Mozilla/5.0"));

    assertThat(session.id()).isEqualTo(id);
    assertThat(session.userId()).isEqualTo(userId);
    assertThat(session.tokenHash()).isEqualTo("sha256:token");
    assertThat(session.csrfSecretHash()).isEqualTo("sha256:csrf");
    assertThat(session.createdAt()).isEqualTo(NOW);
    assertThat(session.lastSeenAt()).isEqualTo(NOW);
    assertThat(session.expiresAt()).isEqualTo(NOW.plus(Session.TTL));
    assertThat(session.revokedAt()).isEmpty();
    assertThat(session.deviceHint()).contains("Mozilla/5.0");
  }

  @Test
  void rejectsABlankTokenHash() {
    assertThatThrownBy(
            () ->
                Session.issue(
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    " ",
                    "sha256:csrf",
                    NOW,
                    Optional.empty()))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void isActiveIsTrueBeforeExpiryAndFalseAfterOrWhenRevoked() {
    Session session =
        Session.issue(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "sha256:token",
            "sha256:csrf",
            NOW,
            Optional.empty());

    assertThat(session.isActive(NOW.plusSeconds(1))).isTrue();
    assertThat(session.isActive(session.expiresAt())).isFalse();
    assertThat(session.isActive(session.expiresAt().plusSeconds(1))).isFalse();

    Session revoked =
        new Session(
            session.id(),
            session.userId(),
            session.tokenHash(),
            session.csrfSecretHash(),
            session.createdAt(),
            session.lastSeenAt(),
            session.expiresAt(),
            Optional.of(NOW.plusSeconds(1)),
            session.deviceHint());
    assertThat(revoked.isActive(NOW.plusSeconds(2))).isFalse();
  }
}

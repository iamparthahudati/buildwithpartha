package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TermsAcceptanceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void termsAcceptedPrefixesTheVersionSoItCannotCollideWithPrivacy() {
    UUID userId = UUID.randomUUID();

    TermsAcceptance acceptance =
        TermsAcceptance.termsAccepted(
            UUID.randomUUID(), userId, "2026-08-01", NOW, Optional.of("203.0.113.1"));

    assertThat(acceptance.termsVersion()).isEqualTo("terms:2026-08-01");
    assertThat(acceptance.userId()).isEqualTo(userId);
    assertThat(acceptance.acceptedAt()).isEqualTo(NOW);
    assertThat(acceptance.ipSource()).contains("203.0.113.1");
  }

  @Test
  void privacyAcknowledgedUsesADistinctPrefixFromTerms() {
    TermsAcceptance acceptance =
        TermsAcceptance.privacyAcknowledged(
            UUID.randomUUID(), UUID.randomUUID(), "2026-08-01", NOW, Optional.empty());

    assertThat(acceptance.termsVersion()).isEqualTo("privacy:2026-08-01");
    assertThat(acceptance.ipSource()).isEmpty();
  }
}

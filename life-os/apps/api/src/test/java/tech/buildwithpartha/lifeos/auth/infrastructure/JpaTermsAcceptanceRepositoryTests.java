package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaTermsAcceptanceRepositoryTests {

  @Autowired private TermsAcceptanceJpaRepository jpaRepository;

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void savedAcceptanceRoundTripsIncludingAnAbsentIpSource() {
    JpaTermsAcceptanceRepository repository = new JpaTermsAcceptanceRepository(jpaRepository);
    UUID userId = UUID.randomUUID();

    TermsAcceptance saved =
        repository.save(
            TermsAcceptance.termsAccepted(
                UUID.randomUUID(), userId, "2026-08-01", NOW, Optional.empty()));
    jpaRepository.flush();

    assertThat(saved.termsVersion()).isEqualTo("terms:2026-08-01");
    assertThat(saved.ipSource()).isEmpty();
    assertThat(jpaRepository.findById(saved.id())).isPresent();
  }

  @Test
  void savedAcceptanceRoundTripsAPresentIpSource() {
    JpaTermsAcceptanceRepository repository = new JpaTermsAcceptanceRepository(jpaRepository);

    TermsAcceptance saved =
        repository.save(
            TermsAcceptance.privacyAcknowledged(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "2026-08-01",
                NOW,
                Optional.of("203.0.113.1")));
    jpaRepository.flush();

    TermsAcceptanceEntity reloaded = jpaRepository.findById(saved.id()).orElseThrow();
    assertThat(reloaded.getIpSource()).isEqualTo("203.0.113.1");
  }
}

package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;

class TermsExportContributorTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private TermsAcceptanceRepository termsRepository;
  private TermsExportContributor contributor;

  @BeforeEach
  void setUp() {
    termsRepository = new FakeTermsAcceptanceRepository();
    TermsAcceptance terms =
        TermsAcceptance.termsAccepted(
            UUID.randomUUID(), USER_ID, "2026-08-16", NOW, Optional.empty());
    termsRepository.save(terms);
    contributor = new TermsExportContributor(termsRepository);
  }

  @Test
  void exportFileName_returnsTermsJson() {
    assertThat(contributor.exportFileName()).isEqualTo("terms.json");
  }

  @Test
  void exportDataForUser_serializesAcceptances() {
    byte[] jsonBytes = contributor.exportDataForUser(USER_ID);
    String json = new String(jsonBytes, StandardCharsets.UTF_8);

    assertThat(json).contains("2026-08-16");
  }
}

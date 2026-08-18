package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaEmailVerificationTokenRepositoryTests {

  @Autowired private EmailVerificationTokenJpaRepository jpaRepository;

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void savedTokenRoundTripsWithAnUnconsumedState() {
    JpaEmailVerificationTokenRepository repository =
        new JpaEmailVerificationTokenRepository(jpaRepository);
    UUID userId = UUID.randomUUID();

    EmailVerificationToken saved =
        repository.save(EmailVerificationToken.issue(UUID.randomUUID(), userId, "sha256:abc", NOW));
    jpaRepository.flush();

    assertThat(saved.userId()).isEqualTo(userId);
    assertThat(saved.tokenHash()).isEqualTo("sha256:abc");
    assertThat(saved.expiresAt()).isEqualTo(NOW.plus(EmailVerificationToken.TTL));
    assertThat(saved.consumedAt()).isEmpty();

    EmailVerificationTokenEntity reloaded = jpaRepository.findById(saved.id()).orElseThrow();
    assertThat(reloaded.getConsumedAt()).isNull();
  }
}

package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaPasswordResetTokenRepositoryTests {

  @Autowired private PasswordResetTokenJpaRepository jpaRepository;

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void savedTokenRoundTripsWithAnUnconsumedState() {
    JpaPasswordResetTokenRepository repository = new JpaPasswordResetTokenRepository(jpaRepository);
    UUID userId = UUID.randomUUID();

    PasswordResetToken saved =
        repository.save(PasswordResetToken.issue(UUID.randomUUID(), userId, "sha256:abc", NOW));
    jpaRepository.flush();

    assertThat(saved.userId()).isEqualTo(userId);
    assertThat(saved.tokenHash()).isEqualTo("sha256:abc");
    assertThat(saved.expiresAt()).isEqualTo(NOW.plus(PasswordResetToken.TTL));
    assertThat(saved.consumedAt()).isEmpty();

    PasswordResetTokenEntity reloaded = jpaRepository.findById(saved.id()).orElseThrow();
    assertThat(reloaded.getConsumedAt()).isNull();
  }

  @Test
  void findByTokenHashLocatesTheMatchingRowOnly() {
    JpaPasswordResetTokenRepository repository = new JpaPasswordResetTokenRepository(jpaRepository);
    repository.save(
        PasswordResetToken.issue(UUID.randomUUID(), UUID.randomUUID(), "sha256:present", NOW));
    jpaRepository.flush();

    assertThat(repository.findByTokenHash("sha256:present")).isPresent();
    assertThat(repository.findByTokenHash("sha256:absent")).isEmpty();
  }

  @Test
  void consumeSucceedsOnceAndFailsOnASecondAttemptForTheSameToken() {
    JpaPasswordResetTokenRepository repository = new JpaPasswordResetTokenRepository(jpaRepository);
    PasswordResetToken saved =
        repository.save(
            PasswordResetToken.issue(
                UUID.randomUUID(), UUID.randomUUID(), "sha256:consume-me", NOW));
    jpaRepository.flush();

    boolean firstAttempt = repository.consume(saved.id(), NOW.plusSeconds(60));
    jpaRepository.flush();
    boolean secondAttempt = repository.consume(saved.id(), NOW.plusSeconds(120));

    assertThat(firstAttempt).isTrue();
    assertThat(secondAttempt).isFalse();
    assertThat(jpaRepository.findById(saved.id()).orElseThrow().getConsumedAt())
        .isEqualTo(NOW.plusSeconds(60));
  }
}

package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.domain.Credential;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaCredentialRepositoryTests {

  @Autowired private CredentialJpaRepository jpaRepository;

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void savedCredentialRoundTripsThroughTheJpaEntity() {
    JpaCredentialRepository repository = new JpaCredentialRepository(jpaRepository);
    UUID userId = UUID.randomUUID();

    Credential saved =
        repository.save(Credential.issue(UUID.randomUUID(), userId, "$argon2id$hash", NOW));
    jpaRepository.flush();

    Credential reloaded = jpaRepository.findById(saved.id()).map(this::toDomain).orElseThrow();
    assertThat(reloaded.userId()).isEqualTo(userId);
    assertThat(reloaded.passwordHash()).isEqualTo("$argon2id$hash");
    assertThat(reloaded.changedAt()).isEqualTo(NOW);
  }

  private Credential toDomain(CredentialEntity entity) {
    return new Credential(
        entity.getId(),
        entity.getUserId(),
        entity.getPasswordHash(),
        entity.getChangedAt(),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }
}

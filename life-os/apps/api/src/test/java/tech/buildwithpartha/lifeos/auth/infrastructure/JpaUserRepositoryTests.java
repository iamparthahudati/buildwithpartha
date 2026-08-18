package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.User;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaUserRepositoryTests {

  @Autowired private UserJpaRepository jpaRepository;

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void savedUserRoundTripsThroughTheJpaEntity() {
    JpaUserRepository repository = new JpaUserRepository(jpaRepository);
    EmailAddress email = EmailAddress.of("New.User@Example.test");
    User user = User.signup(UUID.randomUUID(), email, "New User", NOW);

    User saved = repository.save(user);
    jpaRepository.flush();

    assertThat(saved.id()).isEqualTo(user.id());
    assertThat(saved.email().raw()).isEqualTo("New.User@Example.test");
    assertThat(saved.email().normalized()).isEqualTo("new.user@example.test");
    assertThat(saved.timeZone()).isEqualTo(User.DEFAULT_TIME_ZONE);
    assertThat(saved.locale()).isEqualTo(User.DEFAULT_LOCALE);
    assertThat(saved.weekStart()).isEqualTo(User.DEFAULT_WEEK_START);
    assertThat(saved.accountStatus().name()).isEqualTo("UNVERIFIED");
    assertThat(saved.verifiedAt()).isEmpty();
  }

  @Test
  void existsByEmailNormalizedReflectsPersistedRows() {
    JpaUserRepository repository = new JpaUserRepository(jpaRepository);
    EmailAddress email = EmailAddress.of("present@example.test");
    repository.save(User.signup(UUID.randomUUID(), email, "Present", NOW));
    jpaRepository.flush();

    assertThat(repository.existsByEmailNormalized("present@example.test")).isTrue();
    assertThat(repository.existsByEmailNormalized("absent@example.test")).isFalse();
  }

  @Test
  void findByIdReturnsTheCurrentRowAndReflectsAVerifiedTransition() {
    JpaUserRepository repository = new JpaUserRepository(jpaRepository);
    EmailAddress email = EmailAddress.of("verify-me@example.test");
    User created = repository.save(User.signup(UUID.randomUUID(), email, "Verify Me", NOW));
    jpaRepository.flush();

    assertThat(repository.findById(UUID.randomUUID())).isEmpty();

    Instant verifiedAt = NOW.plusSeconds(60);
    repository.save(created.verify(verifiedAt));
    jpaRepository.flush();

    User reloaded = repository.findById(created.id()).orElseThrow();
    assertThat(reloaded.accountStatus().name()).isEqualTo("ACTIVE");
    assertThat(reloaded.verifiedAt()).contains(verifiedAt);
  }
}

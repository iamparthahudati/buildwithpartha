package tech.buildwithpartha.lifeos.label.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.label.domain.Label;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaLabelRepositoryTests {

  @Autowired private LabelJpaRepository jpaRepository;

  @Test
  void savedLabelRoundTripsThroughTheJpaEntity() {
    JpaLabelRepository repository = new JpaLabelRepository(jpaRepository);
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    Label label = new Label(id, userId, "Work", "work", "red", now, now, 0L);

    Label saved = repository.save(label);
    jpaRepository.flush();

    assertThat(saved.id()).isEqualTo(id);
    assertThat(saved.userId()).isEqualTo(userId);
    assertThat(saved.name()).isEqualTo("Work");
    assertThat(saved.nameNormalized()).isEqualTo("work");
    assertThat(saved.color()).isEqualTo("red");
    assertThat(saved.createdAt()).isEqualTo(now);
    assertThat(saved.updatedAt()).isEqualTo(now);
    assertThat(saved.version()).isZero();

    Label reloaded = repository.findById(id).orElseThrow();
    assertThat(reloaded.name()).isEqualTo("Work");
  }

  @Test
  void findByUserIdReturnsMatchingLabelsOnly() {
    JpaLabelRepository repository = new JpaLabelRepository(jpaRepository);
    UUID userA = UUID.randomUUID();
    UUID userB = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    repository.save(new Label(UUID.randomUUID(), userA, "Work", "work", "red", now, now, 0L));
    repository.save(
        new Label(UUID.randomUUID(), userA, "Personal", "personal", "blue", now, now, 0L));
    repository.save(new Label(UUID.randomUUID(), userB, "Study", "study", null, now, now, 0L));
    jpaRepository.flush();

    List<Label> labelsA = repository.findByUserId(userA);
    assertThat(labelsA).hasSize(2);

    List<Label> labelsB = repository.findByUserId(userB);
    assertThat(labelsB).hasSize(1);
    assertThat(labelsB.get(0).color()).isNull();
  }

  @Test
  void deleteRemovesLabel() {
    JpaLabelRepository repository = new JpaLabelRepository(jpaRepository);
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    Label label = repository.save(new Label(id, userId, "Work", "work", "red", now, now, 0L));
    jpaRepository.flush();

    assertThat(repository.findById(id)).isPresent();

    repository.delete(label);
    jpaRepository.flush();

    assertThat(repository.findById(id)).isEmpty();
  }
}

package tech.buildwithpartha.lifeos.label.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.label.domain.Label;

class JpaLabelRepositoryTests {

  private LabelJpaRepository jpaRepository;
  private JpaLabelRepository repository;

  @BeforeEach
  void setUp() {
    jpaRepository = mock(LabelJpaRepository.class);
    repository = new JpaLabelRepository(jpaRepository);
  }

  @Test
  void findByIdMapsExistingLabel() {
    UUID id = UUID.randomUUID();
    LabelEntity entity =
        new LabelEntity(
            id, UUID.randomUUID(), "Work", "work", "red", Instant.now(), Instant.now(), 1L);

    when(jpaRepository.findById(id)).thenReturn(Optional.of(entity));

    Optional<Label> result = repository.findById(id);

    assertThat(result).isPresent();
    Label domain = result.get();
    assertThat(domain.id()).isEqualTo(id);
    assertThat(domain.name()).isEqualTo("Work");
    assertThat(domain.nameNormalized()).isEqualTo("work");
    assertThat(domain.color()).isEqualTo("red");
    assertThat(domain.version()).isEqualTo(1L);
  }

  @Test
  void findByUserIdReturnsList() {
    UUID userId = UUID.randomUUID();
    LabelEntity entity =
        new LabelEntity(
            UUID.randomUUID(),
            userId,
            "Personal",
            "personal",
            null,
            Instant.now(),
            Instant.now(),
            0L);

    when(jpaRepository.findByUserId(userId)).thenReturn(List.of(entity));

    List<Label> results = repository.findByUserId(userId);

    assertThat(results).hasSize(1);
    assertThat(results.get(0).userId()).isEqualTo(userId);
    assertThat(results.get(0).color()).isNull();
  }

  @Test
  void saveMapsAndPersistsLabel() {
    Label domain =
        new Label(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "Work",
            "work",
            "red",
            Instant.now(),
            Instant.now(),
            0L);

    LabelEntity entity = JpaLabelRepository.toEntity(domain);
    when(jpaRepository.save(any(LabelEntity.class))).thenReturn(entity);

    Label saved = repository.save(domain);

    assertThat(saved.name()).isEqualTo("Work");
    verify(jpaRepository).save(any(LabelEntity.class));
  }

  @Test
  void deleteRemovesLabel() {
    Label domain =
        new Label(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "Work",
            "work",
            "red",
            Instant.now(),
            Instant.now(),
            0L);

    repository.delete(domain);

    verify(jpaRepository).delete(any(LabelEntity.class));
  }
}

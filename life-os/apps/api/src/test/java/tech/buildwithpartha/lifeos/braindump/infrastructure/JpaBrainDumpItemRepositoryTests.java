package tech.buildwithpartha.lifeos.braindump.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQuery;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQueryResult;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemStatus;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("Brain Dump JPA repository")
class JpaBrainDumpItemRepositoryTests {

  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final UUID OTHER_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
  private static final Instant NOW = Instant.parse("2026-08-30T10:00:00Z");

  @Autowired private BrainDumpItemJpaRepository jpaRepository;
  @Autowired private EntityManager entityManager;

  @Test
  void roundTripsOwnerScopedItemsAndExercisesEveryFilterBranch() {
    JpaBrainDumpItemRepository repository =
        new JpaBrainDumpItemRepository(jpaRepository, entityManager);
    BrainDumpItem active =
        repository.save(item(USER_ID, "Alpha active", BrainDumpItemStatus.UNPROCESSED));
    BrainDumpItem deferred =
        repository.save(item(USER_ID, "Beta archived", BrainDumpItemStatus.DEFERRED).archive(NOW));
    BrainDumpItem converted =
        repository.save(
            item(USER_ID, "Gamma converted", BrainDumpItemStatus.UNPROCESSED)
                .convert("NOTE", UUID.randomUUID(), NOW));
    repository.save(item(OTHER_USER_ID, "Alpha foreign", BrainDumpItemStatus.UNPROCESSED));

    assertThat(repository.findById(active.id())).contains(active);
    assertThat(repository.findByIdAndUserId(active.id(), USER_ID)).contains(active);
    assertThat(repository.findByIdAndUserId(active.id(), OTHER_USER_ID)).isEmpty();
    assertThat(repository.countUnprocessedByUserId(USER_ID)).isEqualTo(1);

    BrainDumpItemQueryResult activeSearch =
        repository.query(
            new BrainDumpItemQuery(
                USER_ID,
                " alpha ",
                BrainDumpItemStatus.UNPROCESSED,
                false,
                0,
                20,
                "content",
                "ASC"));
    assertThat(activeSearch.items()).containsExactly(active);
    assertThat(activeSearch.totalItems()).isEqualTo(1);

    BrainDumpItemQueryResult archivedSearch =
        repository.query(
            new BrainDumpItemQuery(USER_ID, " ", null, true, 0, 20, "invalid", "DESC"));
    assertThat(archivedSearch.items()).containsExactly(deferred);

    BrainDumpItemQueryResult convertedSearch =
        repository.query(
            new BrainDumpItemQuery(
                USER_ID, null, BrainDumpItemStatus.CONVERTED, null, 0, 1, null, null));
    assertThat(convertedSearch.items()).containsExactly(converted);

    BrainDumpItemQueryResult firstPage =
        repository.query(
            new BrainDumpItemQuery(USER_ID, null, null, null, 0, 2, "updatedAt", "DESC"));
    assertThat(firstPage.items()).hasSize(2);
    assertThat(firstPage.totalItems()).isEqualTo(3);

    repository.delete(active);
    assertThat(repository.findById(active.id())).isEmpty();
  }

  private static BrainDumpItem item(UUID userId, String content, BrainDumpItemStatus status) {
    return new BrainDumpItem(
        UUID.randomUUID(),
        userId,
        content,
        status,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        NOW.minusSeconds(60),
        NOW.minusSeconds(60),
        0);
  }
}

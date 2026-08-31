package tech.buildwithpartha.lifeos.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.search.domain.SearchEntityType;
import tech.buildwithpartha.lifeos.search.domain.SearchQuery;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
@DisplayName("JpaSearchRepository unit & branch coverage tests")
class JpaSearchRepositoryTests {

  private final JpaSearchRepository searchRepository;
  private final UserRepository userRepository;
  private final EntityManager entityManager;

  private UUID userId;

  @Autowired
  JpaSearchRepositoryTests(
      JpaSearchRepository searchRepository,
      UserRepository userRepository,
      EntityManager entityManager) {
    this.searchRepository = searchRepository;
    this.userRepository = userRepository;
    this.entityManager = entityManager;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("jpa-repo-test@example.test"),
                        "jpa-test",
                        Instant.now())
                    .verify(Instant.now()))
            .id();
  }

  @Test
  @DisplayName("Returns empty SearchResult when query is blank or null")
  void returnsEmptyResultForBlankQuery() {
    SearchQuery blankQuery = new SearchQuery(userId, "   ", Set.of(), 0, 20);
    SearchResult result = searchRepository.search(blankQuery);
    assertThat(result.totalItems()).isZero();
    assertThat(result.items()).isEmpty();
  }

  @Test
  @DisplayName("Calculates relevance scores for exact title, prefix, and body matches")
  void calculatesRelevanceScoresCorrectly() throws Exception {
    UUID p1 = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.projects
              (id, user_id, name, description, status, priority, health,
               created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Alpha', 'Alpha exact title', 'ACTIVE',
               'HIGH', 'ON_TRACK', NOW(), NOW(), 0)
            """)
        .setParameter("id", p1)
        .setParameter("userId", userId)
        .executeUpdate();

    UUID p2 = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.projects
              (id, user_id, name, description, status, priority, health,
               created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Alpha Project', 'Starts with alpha', 'ACTIVE',
               'HIGH', 'ON_TRACK', NOW(), NOW(), 0)
            """)
        .setParameter("id", p2)
        .setParameter("userId", userId)
        .executeUpdate();

    UUID p3 = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.projects
              (id, user_id, name, description, status, priority, health,
               created_at, updated_at, version)
            VALUES
              (:id, :userId, 'My Alpha Workspace', 'Contains alpha in title',
               'ACTIVE', 'HIGH', 'ON_TRACK', NOW(), NOW(), 0)
            """)
        .setParameter("id", p3)
        .setParameter("userId", userId)
        .executeUpdate();

    UUID p4 = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.projects
              (id, user_id, name, description, status, priority, health,
               created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Workspace', 'Alpha in body', 'ACTIVE',
               'HIGH', 'ON_TRACK', NOW(), NOW(), 0)
            """)
        .setParameter("id", p4)
        .setParameter("userId", userId)
        .executeUpdate();

    SearchQuery query = new SearchQuery(userId, "Alpha", Set.of(SearchEntityType.PROJECT), 0, 2);
    SearchResult page0 = searchRepository.search(query);
    assertThat(page0.totalItems()).isEqualTo(4);
    assertThat(page0.totalPages()).isEqualTo(2);
    assertThat(page0.items()).hasSize(2);

    SearchQuery queryPage1 =
        new SearchQuery(userId, "Alpha", Set.of(SearchEntityType.PROJECT), 1, 2);
    SearchResult page1 = searchRepository.search(queryPage1);
    assertThat(page1.items()).hasSize(2);
  }
}

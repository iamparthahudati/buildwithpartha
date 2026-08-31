package tech.buildwithpartha.lifeos.search.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.search.application.SearchQueryCommand;
import tech.buildwithpartha.lifeos.search.domain.SearchEntityType;
import tech.buildwithpartha.lifeos.search.domain.SearchItem;
import tech.buildwithpartha.lifeos.search.domain.SearchQuery;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("SearchController integration tests")
class SearchControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final EntityManager entityManager;

  private UUID userAId;
  private Cookie cookieA;
  private UUID userBId;

  @Autowired
  SearchControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      EntityManager entityManager) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.entityManager = entityManager;
  }

  @BeforeEach
  void setUp() {
    userAId = createUser("search-user-a");
    RawToken tokenA = tokenGenerator.generate();
    RawToken csrfA = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userAId,
            tokenA.hash(),
            csrfA.hash(),
            Instant.now(),
            Optional.empty()));
    cookieA = new Cookie("lifeos_session", tokenA.value());

    userBId = createUser("search-user-b");
  }

  private UUID createUser(String prefix) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "@example.test"),
                    prefix,
                    Instant.now())
                .verify(Instant.now()))
        .id();
  }

  @Test
  @DisplayName("Rejects unauthenticated global search request with 401")
  void rejectsUnauthenticatedRequest() throws Exception {
    mockMvc.perform(get("/search").param("q", "test")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Returns empty results when query is empty or blank")
  void returnsEmptyResultsForBlankQuery() throws Exception {
    mockMvc
        .perform(get("/search").cookie(cookieA).param("q", ""))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(0))
        .andExpect(jsonPath("$.items").isEmpty());
  }

  @Test
  @DisplayName("Searches across entities with owner isolation and highlighting")
  void executesGlobalSearchAcrossEntities() throws Exception {
    UUID idProj = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.projects
              (id, user_id, name, description, status, priority, health,
               created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Project Alpha Launch', 'Description of alpha project',
               'ACTIVE', 'HIGH', 'ON_TRACK', NOW(), NOW(), 0)
            """)
        .setParameter("id", idProj)
        .setParameter("userId", userAId)
        .executeUpdate();

    UUID idTask = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.tasks
              (id, user_id, title, description, status, priority, estimate_minutes,
               spent_minutes, progress, position, created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Task Alpha setup', 'Alpha task description',
               'TODO', 'MEDIUM', 30, 0, 0, 0, NOW(), NOW(), 0)
            """)
        .setParameter("id", idTask)
        .setParameter("userId", userAId)
        .executeUpdate();

    UUID idDeletedTask = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.tasks
              (id, user_id, title, description, status, priority, estimate_minutes,
               spent_minutes, progress, position, deleted_at, created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Task Alpha deleted', 'Deleted alpha task',
               'TODO', 'MEDIUM', 30, 0, 0, 0, NOW(), NOW(), NOW(), 0)
            """)
        .setParameter("id", idDeletedTask)
        .setParameter("userId", userAId)
        .executeUpdate();

    UUID idNote = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.notes
              (id, user_id, title, body, pinned, archived, created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Note Alpha meeting', 'Notes from Alpha strategy session',
               false, false, NOW(), NOW(), 0)
            """)
        .setParameter("id", idNote)
        .setParameter("userId", userAId)
        .executeUpdate();

    UUID idBrain = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.brain_dump_items
              (id, user_id, content, status, created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Alpha brain dump idea', 'UNPROCESSED', NOW(), NOW(), 0)
            """)
        .setParameter("id", idBrain)
        .setParameter("userId", userAId)
        .executeUpdate();

    UUID idGoal = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.goals
              (id, user_id, title, description, category, progress_type, current_value,
               status, check_in_cadence, archived, created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Goal Alpha target', 'Achieve Alpha milestone', 'WORK',
               'PERCENTAGE', 0, 'IN_PROGRESS', 'WEEKLY', false, NOW(), NOW(), 0)
            """)
        .setParameter("id", idGoal)
        .setParameter("userId", userAId)
        .executeUpdate();

    UUID idHabit = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.habits
              (id, user_id, name, description, cadence_type, target_count, time_zone,
               reminder_enabled, archived, created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Habit Alpha review', 'Daily Alpha habit check',
               'DAILY', 1, 'UTC', false, false, NOW(), NOW(), 0)
            """)
        .setParameter("id", idHabit)
        .setParameter("userId", userAId)
        .executeUpdate();

    // User B project with same text (must not appear in User A search)
    UUID idUserBProj = UUID.randomUUID();
    entityManager
        .createNativeQuery(
            """
            INSERT INTO public.projects
              (id, user_id, name, description, status, priority, health,
               created_at, updated_at, version)
            VALUES
              (:id, :userId, 'Project Alpha User B', 'User B secret',
               'ACTIVE', 'HIGH', 'ON_TRACK', NOW(), NOW(), 0)
            """)
        .setParameter("id", idUserBProj)
        .setParameter("userId", userBId)
        .executeUpdate();

    // 1. Search for "Alpha"
    mockMvc
        .perform(get("/search").cookie(cookieA).param("q", "Alpha"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(6))
        .andExpect(jsonPath("$.counts.PROJECT").value(1))
        .andExpect(jsonPath("$.counts.TASK").value(1))
        .andExpect(jsonPath("$.counts.NOTE").value(1))
        .andExpect(jsonPath("$.counts.BRAIN_DUMP").value(1))
        .andExpect(jsonPath("$.counts.GOAL").value(1))
        .andExpect(jsonPath("$.counts.HABIT").value(1))
        .andExpect(jsonPath("$.items[?(@.id=='" + idUserBProj + "')]").doesNotExist())
        .andExpect(jsonPath("$.items[?(@.id=='" + idDeletedTask + "')]").doesNotExist());

    // 2. Search with types filter "PROJECT,TASK"
    mockMvc
        .perform(get("/search").cookie(cookieA).param("q", "Alpha").param("types", "PROJECT,TASK"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(2))
        .andExpect(jsonPath("$.counts.PROJECT").value(1))
        .andExpect(jsonPath("$.counts.TASK").value(1));

    // 3. Search with single type parameter "type=NOTE"
    mockMvc
        .perform(get("/search").cookie(cookieA).param("q", "Alpha").param("type", "NOTE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.counts.NOTE").value(1));

    // 4. Search with invalid type parameter and blank typeParam
    mockMvc
        .perform(get("/search").cookie(cookieA).param("q", "Alpha").param("type", "   "))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(6));

    // 5. Search with single item in typesParam and pagination
    mockMvc
        .perform(
            get("/search")
                .cookie(cookieA)
                .param("q", "Alpha")
                .param("types", "GOAL")
                .param("page", "0")
                .param("size", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.counts.GOAL").value(1));

    // 6. Check safe highlight <mark> tags
    mockMvc
        .perform(get("/search").cookie(cookieA).param("q", "Alpha").param("types", "PROJECT"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].title").value("Project <mark>Alpha</mark> Launch"));
  }

  @Test
  @DisplayName("Verifies sensitive query and text content is redacted in toString overrides")
  void verifiesToStringRedaction() {
    SearchItem item =
        new SearchItem(
            UUID.randomUUID(),
            SearchEntityType.NOTE,
            "Secret Note Title",
            "Secret Note Content",
            100.0,
            Instant.now(),
            "/life-os/app/notes/123");
    assertThat(item.toString()).doesNotContain("Secret Note Title").contains("REDACTED");

    SearchQuery query =
        new SearchQuery(userAId, "Secret Query", Set.of(SearchEntityType.NOTE), 0, 20);
    assertThat(query.toString()).doesNotContain("Secret Query").contains("REDACTED");

    SearchQueryCommand cmd =
        new SearchQueryCommand(userAId, "Secret Query", Set.of(SearchEntityType.NOTE), 0, 20);
    assertThat(cmd.toString()).doesNotContain("Secret Query").contains("REDACTED");

    SearchResult result = SearchResult.empty(query);
    assertThat(result.toString()).doesNotContain("Secret Query").contains("REDACTED");

    SearchResponse response = SearchResponse.fromDomain(result);
    assertThat(response.toString()).doesNotContain("Secret Query").contains("REDACTED");

    SearchResultItemResponse itemResp = SearchResultItemResponse.fromDomain(item);
    assertThat(itemResp.toString()).doesNotContain("Secret Note Title").contains("REDACTED");
  }
}

package tech.buildwithpartha.lifeos.search.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Search domain objects unit tests")
class SearchDomainTests {

  @Test
  @DisplayName("SearchQuery handles default parameters and validation")
  void searchQueryHandlesDefaults() {
    UUID userId = UUID.randomUUID();
    SearchQuery query1 = new SearchQuery(userId, "test", null, 0, 20);
    assertThat(query1.types()).hasSize(SearchEntityType.values().length);

    SearchQuery query2 = new SearchQuery(userId, "test", Set.of(), 0, 20);
    assertThat(query2.types()).hasSize(SearchEntityType.values().length);

    SearchQuery queryNegativePage = new SearchQuery(userId, "test", null, -5, -10);
    assertThat(queryNegativePage.page()).isZero();
    assertThat(queryNegativePage.size()).isEqualTo(20);

    SearchQuery queryHugeSize = new SearchQuery(userId, "test", null, 0, 500);
    assertThat(queryHugeSize.size()).isEqualTo(100);

    assertThat(query1.toString()).contains("[REDACTED]");

    assertThatThrownBy(() -> new SearchQuery(null, "test", Set.of(), 0, 20))
        .isInstanceOf(NullPointerException.class);
  }

  @Test
  @DisplayName("SearchItem creates valid domain instances")
  void searchItemProperties() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.now();
    SearchItem item =
        new SearchItem(
            id, SearchEntityType.PROJECT, "Title", "Snippet", 90.0, now, "/projects/" + id);

    assertThat(item.id()).isEqualTo(id);
    assertThat(item.type()).isEqualTo(SearchEntityType.PROJECT);
    assertThat(item.title()).isEqualTo("Title");
    assertThat(item.snippet()).isEqualTo("Snippet");
    assertThat(item.score()).isEqualTo(90.0);
    assertThat(item.updatedAt()).isEqualTo(now);
    assertThat(item.targetUrl()).isEqualTo("/projects/" + id);
    assertThat(item.toString()).contains("[REDACTED]");
  }

  @Test
  @DisplayName("SearchResult empty and populated factories work correctly")
  void searchResultFactories() {
    UUID userId = UUID.randomUUID();
    SearchQuery query = new SearchQuery(userId, "test", Set.of(SearchEntityType.NOTE), 0, 20);

    SearchResult empty = SearchResult.empty(query);
    assertThat(empty.totalItems()).isZero();
    assertThat(empty.totalPages()).isZero();
    assertThat(empty.items()).isEmpty();
    assertThat(empty.toString()).contains("[REDACTED]");

    SearchItem item =
        new SearchItem(
            UUID.randomUUID(),
            SearchEntityType.NOTE,
            "Note",
            "Snippet",
            10.0,
            Instant.now(),
            "/notes/1");
    SearchGroup group = new SearchGroup(SearchEntityType.NOTE, 1, List.of(item));
    SearchResult populated =
        new SearchResult(
            query.query(),
            1,
            0,
            20,
            1,
            Map.of(SearchEntityType.NOTE, 1L),
            List.of(group),
            List.of(item));

    assertThat(populated.totalItems()).isEqualTo(1);
    assertThat(populated.groups()).hasSize(1);
    assertThat(populated.items()).hasSize(1);
  }
}

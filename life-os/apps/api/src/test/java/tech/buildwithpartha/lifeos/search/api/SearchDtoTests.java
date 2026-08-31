package tech.buildwithpartha.lifeos.search.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.search.domain.SearchEntityType;
import tech.buildwithpartha.lifeos.search.domain.SearchGroup;
import tech.buildwithpartha.lifeos.search.domain.SearchItem;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

@DisplayName("Search DTO unit tests")
class SearchDtoTests {

  @Test
  @DisplayName("Handles null domain objects and null record arguments safely")
  void handlesNullDomainInDtoFactories() {
    assertThatThrownBy(() -> SearchResponse.fromDomain(null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> SearchGroupResponse.fromDomain(null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> SearchResultItemResponse.fromDomain(null))
        .isInstanceOf(NullPointerException.class);

    SearchResponse nullResponse = new SearchResponse("q", 0, 0, 20, 0, null, null, null);
    assertThat(nullResponse.counts()).isEmpty();
    assertThat(nullResponse.groups()).isEmpty();
    assertThat(nullResponse.items()).isEmpty();

    assertThatThrownBy(() -> new SearchGroupResponse(null, 0, null))
        .isInstanceOf(NullPointerException.class);

    SearchGroupResponse validGroup = new SearchGroupResponse("TASK", 0, null);
    assertThat(validGroup.type()).isEqualTo("TASK");
    assertThat(validGroup.items()).isEmpty();

    UUID id = UUID.randomUUID();
    Instant now = Instant.now();
    SearchResultItemResponse nullFieldsItem =
        new SearchResultItemResponse(id, "TASK", null, null, 0.0, now, null);
    assertThat(nullFieldsItem.type()).isEqualTo("TASK");
    assertThat(nullFieldsItem.title()).isEmpty();
    assertThat(nullFieldsItem.snippet()).isEmpty();
    assertThat(nullFieldsItem.href()).isEmpty();
    assertThat(nullFieldsItem.toString()).contains("[REDACTED]");
  }

  @Test
  @DisplayName("Converts SearchResult domain to SearchResponse DTO")
  void convertsDomainToResponse() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.now();
    SearchItem item =
        new SearchItem(id, SearchEntityType.TASK, "Title", "Snippet", 50.0, now, "/tasks/" + id);
    SearchGroup group = new SearchGroup(SearchEntityType.TASK, 1, List.of(item));
    SearchResult domain =
        new SearchResult(
            "test", 1, 0, 20, 1, Map.of(SearchEntityType.TASK, 1L), List.of(group), List.of(item));

    SearchResponse response = SearchResponse.fromDomain(domain);
    assertThat(response).isNotNull();
    assertThat(response.query()).isEqualTo("test");
    assertThat(response.totalItems()).isEqualTo(1);
    assertThat(response.page()).isZero();
    assertThat(response.size()).isEqualTo(20);
    assertThat(response.totalPages()).isEqualTo(1);
    assertThat(response.counts()).containsEntry("TASK", 1L);
    assertThat(response.groups()).hasSize(1);
    assertThat(response.items()).hasSize(1);
    assertThat(response.toString()).contains("[REDACTED]");
  }
}

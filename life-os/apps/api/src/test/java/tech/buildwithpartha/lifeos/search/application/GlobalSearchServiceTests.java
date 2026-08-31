package tech.buildwithpartha.lifeos.search.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.search.domain.SearchEntityType;
import tech.buildwithpartha.lifeos.search.domain.SearchQuery;
import tech.buildwithpartha.lifeos.search.domain.SearchRepository;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

@DisplayName("GlobalSearchService unit tests")
class GlobalSearchServiceTests {

  private SearchRepository searchRepository;
  private GlobalSearchService searchService;
  private UUID userId;

  @BeforeEach
  void setUp() {
    searchRepository = mock(SearchRepository.class);
    searchService = new GlobalSearchService(searchRepository);
    userId = UUID.randomUUID();
  }

  @Test
  @DisplayName("Validates search query parameters and throws FieldValidationException")
  void validatesQueryParameters() {
    SearchQueryCommand invalidPage = new SearchQueryCommand(userId, "test", Set.of(), -1, 20);
    assertThatThrownBy(() -> searchService.search(invalidPage))
        .isInstanceOf(FieldValidationException.class);

    SearchQueryCommand invalidSizeMin = new SearchQueryCommand(userId, "test", Set.of(), 0, 0);
    assertThatThrownBy(() -> searchService.search(invalidSizeMin))
        .isInstanceOf(FieldValidationException.class);

    SearchQueryCommand invalidSizeMax = new SearchQueryCommand(userId, "test", Set.of(), 0, 101);
    assertThatThrownBy(() -> searchService.search(invalidSizeMax))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  @DisplayName("Delegates valid search command to SearchRepository")
  void delegatesToRepository() {
    SearchQueryCommand command =
        new SearchQueryCommand(userId, "test", Set.of(SearchEntityType.NOTE), 0, 20);
    SearchQuery searchQuery = new SearchQuery(userId, "test", Set.of(SearchEntityType.NOTE), 0, 20);
    SearchResult mockResult = SearchResult.empty(searchQuery);
    when(searchRepository.search(any())).thenReturn(mockResult);

    SearchResult result = searchService.search(command);
    assertThat(result).isNotNull();
    verify(searchRepository).search(any());
  }
}

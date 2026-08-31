package tech.buildwithpartha.lifeos.search.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.search.domain.SearchQuery;
import tech.buildwithpartha.lifeos.search.domain.SearchRepository;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

/** Transactional application service for executing global search queries (LOS-1301). */
@Service
public class GlobalSearchService {

  private final SearchRepository searchRepository;

  public GlobalSearchService(SearchRepository searchRepository) {
    this.searchRepository = Objects.requireNonNull(searchRepository, "searchRepository");
  }

  @Transactional(readOnly = true)
  public SearchResult search(SearchQueryCommand command) {
    Objects.requireNonNull(command, "command");
    validate(command);

    SearchQuery searchQuery =
        new SearchQuery(
            command.userId(), command.query(), command.types(), command.page(), command.size());

    return searchRepository.search(searchQuery);
  }

  private static void validate(SearchQueryCommand command) {
    List<FieldProblem> errors = new ArrayList<>();
    if (command.page() < 0) {
      errors.add(new FieldProblem("page", "MIN_VALUE_EXCEEDED"));
    }
    if (command.size() < 1 || command.size() > 100) {
      errors.add(new FieldProblem("size", "OUT_OF_RANGE"));
    }
    if (!errors.isEmpty()) {
      throw new FieldValidationException("Invalid search parameters", errors);
    }
  }
}

package tech.buildwithpartha.lifeos.search.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.search.application.GlobalSearchService;
import tech.buildwithpartha.lifeos.search.application.SearchQueryCommand;
import tech.buildwithpartha.lifeos.search.domain.SearchEntityType;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

/** REST controller exposing user-scoped global search endpoints (LOS-1301). */
@RestController
@RequestMapping("/search")
@SecurityRequirement(name = "sessionCookie")
public class SearchController {

  private final GlobalSearchService globalSearchService;

  public SearchController(GlobalSearchService globalSearchService) {
    this.globalSearchService = globalSearchService;
  }

  @Operation(
      summary = "Global search",
      description =
          "User-scoped indexed search across projects, tasks, notes, "
              + "brain dump items, goals, and habits.")
  @ApiResponse(responseCode = "200", description = "Global search results.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public SearchResponse search(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "q", required = false) String q,
      @RequestParam(name = "types", required = false) Set<String> typesParam,
      @RequestParam(name = "type", required = false) String typeParam,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size) {

    Set<SearchEntityType> types = parseTypes(typesParam, typeParam);
    SearchQueryCommand command = new SearchQueryCommand(userId, q, types, page, size);
    SearchResult result = globalSearchService.search(command);
    return SearchResponse.fromDomain(result);
  }

  private static Set<SearchEntityType> parseTypes(Set<String> typesParam, String typeParam) {
    Set<SearchEntityType> result = new HashSet<>();
    if (typesParam != null) {
      for (String raw : typesParam) {
        if (raw == null || raw.isBlank()) {
          continue;
        }
        for (String split : raw.split(",")) {
          SearchEntityType type = SearchEntityType.parse(split);
          if (type != null) {
            result.add(type);
          }
        }
      }
    }
    if (typeParam != null && !typeParam.isBlank()) {
      SearchEntityType type = SearchEntityType.parse(typeParam);
      if (type != null) {
        result.add(type);
      }
    }
    return result;
  }
}

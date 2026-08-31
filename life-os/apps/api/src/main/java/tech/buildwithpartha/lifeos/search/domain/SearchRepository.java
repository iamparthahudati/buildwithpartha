package tech.buildwithpartha.lifeos.search.domain;

/** Repository domain port for global search queries (LOS-1301). */
public interface SearchRepository {

  SearchResult search(SearchQuery query);
}

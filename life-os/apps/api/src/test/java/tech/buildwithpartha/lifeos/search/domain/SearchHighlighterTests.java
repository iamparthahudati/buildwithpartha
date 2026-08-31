package tech.buildwithpartha.lifeos.search.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("SearchHighlighter unit tests")
class SearchHighlighterTests {

  @Test
  @DisplayName("Escapes HTML special characters safely")
  void escapesHtmlSpecialCharacters() {
    assertThat(SearchHighlighter.escapeHtml(null)).isEmpty();
    assertThat(SearchHighlighter.escapeHtml("")).isEmpty();

    String raw = "<script>alert('xss & \"fun\"')</script>";
    String escaped = SearchHighlighter.escapeHtml(raw);

    assertThat(escaped)
        .doesNotContain("<script>")
        .contains("&lt;script&gt;")
        .contains("&#39;xss &amp; &quot;fun&quot;&#39;");
  }

  @Test
  @DisplayName("Highlights matching term safely with mark tags")
  void highlightsMatchingTerm() {
    assertThat(SearchHighlighter.highlight(null, "alpha")).isEmpty();
    assertThat(SearchHighlighter.highlight("", "alpha")).isEmpty();
    assertThat(SearchHighlighter.highlight("Project Alpha", null)).isEqualTo("Project Alpha");
    assertThat(SearchHighlighter.highlight("Project Alpha", "")).isEqualTo("Project Alpha");
    assertThat(SearchHighlighter.highlight("Project Alpha", "beta")).isEqualTo("Project Alpha");

    String raw = "Project Alpha launch plan";
    String result = SearchHighlighter.highlight(raw, "alpha");

    assertThat(result).isEqualTo("Project <mark>Alpha</mark> launch plan");
  }

  @Test
  @DisplayName("Extracts snippet around matching text and highlights")
  void extractsSnippetAndHighlights() {
    assertThat(SearchHighlighter.extractSnippetAndHighlight(null, "test")).isEmpty();
    assertThat(SearchHighlighter.extractSnippetAndHighlight("  ", "test")).isEmpty();

    assertThat(SearchHighlighter.extractSnippetAndHighlight("Short text", null))
        .isEqualTo("Short text");

    String longTextNoQuery = "A".repeat(200);
    assertThat(SearchHighlighter.extractSnippetAndHighlight(longTextNoQuery, null))
        .hasSize(163)
        .endsWith("...");

    assertThat(SearchHighlighter.extractSnippetAndHighlight("Short text", "notFound"))
        .isEqualTo("Short text");

    assertThat(SearchHighlighter.extractSnippetAndHighlight(longTextNoQuery, "notFound"))
        .hasSize(163)
        .endsWith("...");

    String raw =
        "This is a very long text sentence describing the overall strategy. "
            + "We need to finalize the quarterly launch roadmap before December. "
            + "Additional documentation goes here.";
    String snippet = SearchHighlighter.extractSnippetAndHighlight(raw, "roadmap");

    assertThat(snippet).contains("<mark>roadmap</mark>").contains("quarterly launch");
  }
}

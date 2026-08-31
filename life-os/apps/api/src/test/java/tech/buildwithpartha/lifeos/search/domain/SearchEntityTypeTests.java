package tech.buildwithpartha.lifeos.search.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("SearchEntityType unit tests")
class SearchEntityTypeTests {

  @Test
  @DisplayName("Builds target URLs correctly for entities")
  void buildsTargetUrlCorrectly() {
    UUID id = UUID.randomUUID();
    assertThat(SearchEntityType.PROJECT.buildTargetUrl(id))
        .isEqualTo("/life-os/app/projects/" + id);
    assertThat(SearchEntityType.PROJECT.buildTargetUrl(null)).isEqualTo("/life-os/app/projects/");
    assertThat(SearchEntityType.BRAIN_DUMP.buildTargetUrl(id)).isEqualTo("/life-os/app/brain-dump");
    assertThat(SearchEntityType.BRAIN_DUMP.buildTargetUrl(null))
        .isEqualTo("/life-os/app/brain-dump");
  }

  @Test
  @DisplayName("Parses API type strings case-insensitively and handles invalid input")
  void parsesTypeStringsCorrectly() {
    assertThat(SearchEntityType.parse(null)).isNull();
    assertThat(SearchEntityType.parse("  ")).isNull();
    assertThat(SearchEntityType.parse("project")).isEqualTo(SearchEntityType.PROJECT);
    assertThat(SearchEntityType.parse("brain-dump")).isEqualTo(SearchEntityType.BRAIN_DUMP);
    assertThat(SearchEntityType.parse("braindump")).isEqualTo(SearchEntityType.BRAIN_DUMP);
    assertThat(SearchEntityType.parse("invalid_type")).isNull();
  }
}

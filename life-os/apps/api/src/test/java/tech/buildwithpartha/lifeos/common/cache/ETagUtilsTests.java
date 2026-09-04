package tech.buildwithpartha.lifeos.common.cache;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ETagUtilsTests {

  @Test
  @DisplayName("formatETag quotes unquoted strings correctly")
  void formatETagQuotesUnquotedStrings() {
    assertThat(ETagUtils.formatETag("12345")).isEqualTo("\"12345\"");
    assertThat(ETagUtils.formatETag("\"12345\"")).isEqualTo("\"12345\"");
    assertThat(ETagUtils.formatETag(null)).isNull();
    assertThat(ETagUtils.formatETag("  ")).isNull();
  }

  @Test
  @DisplayName("formatWeakETag adds weak prefix correctly")
  void formatWeakETagAddsPrefixCorrectly() {
    assertThat(ETagUtils.formatWeakETag("12345")).isEqualTo("W/\"12345\"");
    assertThat(ETagUtils.formatWeakETag("\"12345\"")).isEqualTo("W/\"12345\"");
    assertThat(ETagUtils.formatWeakETag("W/\"12345\"")).isEqualTo("W/\"12345\"");
    assertThat(ETagUtils.formatWeakETag(null)).isNull();
    assertThat(ETagUtils.formatWeakETag("  ")).isNull();
  }

  @Test
  @DisplayName("matches correctly evaluates If-None-Match headers")
  void matchesEvaluatesIfNoneMatchHeaders() {
    assertThat(ETagUtils.matches("\"12345\"", "\"12345\"")).isTrue();
    assertThat(ETagUtils.matches("W/\"12345\"", "\"12345\"")).isTrue();
    assertThat(ETagUtils.matches("\"12345\"", "W/\"12345\"")).isTrue();
    assertThat(ETagUtils.matches("*", "\"12345\"")).isTrue();
    assertThat(ETagUtils.matches("\"other\", \"12345\"", "\"12345\"")).isTrue();
    assertThat(ETagUtils.matches("\"other\"", "\"12345\"")).isFalse();
    assertThat(ETagUtils.matches(null, "\"12345\"")).isFalse();
    assertThat(ETagUtils.matches("\"12345\"", null)).isFalse();
  }
}

package tech.buildwithpartha.lifeos.common.concurrency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.OptionalLong;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tech.buildwithpartha.lifeos.common.error.PreconditionFailedException;

class ETagUtilsTests {

  @Test
  @DisplayName("formatETag wraps version in double quotes")
  void formatETag_wrapsVersionInQuotes() {
    assertThat(ETagUtils.formatETag(1L)).isEqualTo("\"1\"");
    assertThat(ETagUtils.formatETag(42L)).isEqualTo("\"42\"");
  }

  @Test
  @DisplayName("parseETag extracts numeric version from various ETag formats")
  void parseETag_extractsVersionFromVariousFormats() {
    assertThat(ETagUtils.parseETag("\"123\"")).isEqualTo(OptionalLong.of(123L));
    assertThat(ETagUtils.parseETag("W/\"456\"")).isEqualTo(OptionalLong.of(456L));
    assertThat(ETagUtils.parseETag("w/\"789\"")).isEqualTo(OptionalLong.of(789L));
    assertThat(ETagUtils.parseETag("100")).isEqualTo(OptionalLong.of(100L));
    assertThat(ETagUtils.parseETag(null)).isEmpty();
    assertThat(ETagUtils.parseETag("  ")).isEmpty();
    assertThat(ETagUtils.parseETag("invalid")).isEmpty();
  }

  @Test
  @DisplayName("validateIfMatch succeeds when header is null, blank, or wildcard")
  void validateIfMatch_succeedsWhenOptionalOrWildcard() {
    ETagUtils.validateIfMatch(null, 5L);
    ETagUtils.validateIfMatch("", 5L);
    ETagUtils.validateIfMatch("   ", 5L);
    ETagUtils.validateIfMatch("*", 5L);
  }

  @Test
  @DisplayName("validateIfMatch succeeds when expected version matches current version")
  void validateIfMatch_succeedsWhenVersionMatches() {
    ETagUtils.validateIfMatch("\"5\"", 5L);
    ETagUtils.validateIfMatch("W/\"5\"", 5L);
    ETagUtils.validateIfMatch("5", 5L);
  }

  @Test
  @DisplayName("validateIfMatch throws PreconditionFailedException when version mismatches")
  void validateIfMatch_throwsPreconditionFailedWhenMismatch() {
    assertThatThrownBy(() -> ETagUtils.validateIfMatch("\"4\"", 5L))
        .isInstanceOf(PreconditionFailedException.class)
        .hasMessageContaining("expected version 5 but received 4");
  }

  @Test
  @DisplayName("validateIfMatch throws PreconditionFailedException when unparseable")
  void validateIfMatch_throwsPreconditionFailedWhenUnparseable() {
    assertThatThrownBy(() -> ETagUtils.validateIfMatch("invalid-etag", 5L))
        .isInstanceOf(PreconditionFailedException.class)
        .hasMessageContaining("Malformed If-Match header value");
  }

  @Test
  @DisplayName("withETag creates ResponseEntity with ETag header")
  void withETag_createsResponseWithETagHeader() {
    ResponseEntity<String> response = ETagUtils.withETag("payload", 3L);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getHeaders().getFirst(HttpHeaders.ETAG)).isEqualTo("\"3\"");
    assertThat(response.getBody()).isEqualTo("payload");
  }
}

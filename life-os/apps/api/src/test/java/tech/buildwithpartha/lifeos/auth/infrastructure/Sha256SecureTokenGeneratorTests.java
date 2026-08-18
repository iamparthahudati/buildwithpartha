package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;

class Sha256SecureTokenGeneratorTests {

  @Test
  void generatesAUrlSafeUnpaddedValueOfTheExpectedLength() {
    RawToken token = new Sha256SecureTokenGenerator().generate();

    assertThat(token.value()).doesNotContain("+", "/", "=");
    assertThat(token.value()).hasSize(43);
  }

  @Test
  void eachCallProducesADistinctValue() {
    Sha256SecureTokenGenerator generator = new Sha256SecureTokenGenerator();

    assertThat(generator.generate().value()).isNotEqualTo(generator.generate().value());
  }

  @Test
  void hashIsTheSha256HexDigestOfTheValueWithAStablePrefix() throws NoSuchAlgorithmException {
    RawToken token = new Sha256SecureTokenGenerator().generate();

    byte[] expected =
        MessageDigest.getInstance("SHA-256").digest(token.value().getBytes(StandardCharsets.UTF_8));
    assertThat(token.hash()).isEqualTo("sha256:" + HexFormat.of().formatHex(expected));
  }

  @Test
  void hashOfAPresentedRawValueMatchesTheHashComputedAtGenerationTime() {
    Sha256SecureTokenGenerator generator = new Sha256SecureTokenGenerator();
    RawToken token = generator.generate();

    assertThat(generator.hash(token.value())).isEqualTo(token.hash());
  }

  @Test
  void hashOfADifferentValueNeverMatches() {
    Sha256SecureTokenGenerator generator = new Sha256SecureTokenGenerator();

    assertThat(generator.hash("value-one")).isNotEqualTo(generator.hash("value-two"));
  }
}

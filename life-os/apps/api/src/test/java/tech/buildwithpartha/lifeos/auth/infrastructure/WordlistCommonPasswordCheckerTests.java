package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

class WordlistCommonPasswordCheckerTests {

  private final WordlistCommonPasswordChecker checker = new WordlistCommonPasswordChecker();

  @Test
  void flagsAWellKnownBreachedPassword() {
    assertThat(checker.isCommon(RawPassword.of("password123"))).isTrue();
  }

  @Test
  void matchesCaseInsensitively() {
    assertThat(checker.isCommon(RawPassword.of("Password123"))).isTrue();
    assertThat(checker.isCommon(RawPassword.of("PASSWORD123"))).isTrue();
  }

  @Test
  void doesNotFlagAnUnlistedPassphrase() {
    assertThat(checker.isCommon(RawPassword.of("Xk7#mQ2$vB9zT4nR"))).isFalse();
  }

  @Test
  void ignoresCommentAndBlankLinesInTheWordlist() {
    assertThat(checker.isCommon(RawPassword.of("#"))).isFalse();
    assertThat(checker.isCommon(RawPassword.of(""))).isFalse();
  }
}

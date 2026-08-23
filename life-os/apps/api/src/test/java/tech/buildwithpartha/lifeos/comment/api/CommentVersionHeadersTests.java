package tech.buildwithpartha.lifeos.comment.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

class CommentVersionHeadersTests {

  @Test
  void acceptsNumericAndQuotedVersions() {
    assertThat(CommentVersionHeaders.parse("3")).isEqualTo(3);
    assertThat(CommentVersionHeaders.parse("\"4\"")).isEqualTo(4);
  }

  @Test
  void rejectsMissingMalformedAndNegativeVersionsAsSafeValidation() {
    assertThatThrownBy(() -> CommentVersionHeaders.parse(null))
        .isInstanceOf(FieldValidationException.class);
    assertThatThrownBy(() -> CommentVersionHeaders.parse("stale"))
        .isInstanceOf(FieldValidationException.class);
    assertThatThrownBy(() -> CommentVersionHeaders.parse("-1"))
        .isInstanceOf(FieldValidationException.class);
  }
}

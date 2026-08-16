package tech.buildwithpartha.lifeos.common.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ErrorContractsTests {

  @Test
  void createsStableUpperSnakeCaseCodes() {
    ErrorCode code = ErrorCode.of("TASK_NOT_FOUND");

    assertThat(code.value()).isEqualTo("TASK_NOT_FOUND");
    assertThat(code).hasToString("TASK_NOT_FOUND");
  }

  @Test
  void rejectsUnstableCodeFormats() {
    assertThatThrownBy(() -> ErrorCode.of("task-not-found"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("upper snake case");
    assertThatThrownBy(() -> ErrorCode.of("TASK__NOT_FOUND"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatNullPointerException()
        .isThrownBy(() -> ErrorCode.of(null))
        .withMessage("value must not be null");
  }

  @Test
  void codedExceptionRetainsItsCodeAndCause() {
    ErrorCode code = ErrorCode.of("TASK_CONFLICT");
    IllegalStateException cause = new IllegalStateException("fixture cause");

    TestCodedException exception = new TestCodedException(code, "fixture message", cause);

    assertThat(exception.code()).isSameAs(code);
    assertThat(exception.getCause()).isSameAs(cause);
    assertThat(exception).hasMessage("fixture message");
  }

  @Test
  void codedExceptionSupportsFailuresWithoutACause() {
    ErrorCode code = ErrorCode.of("TASK_INVALID");

    TestCodedException exception = new TestCodedException(code, "fixture message");

    assertThat(exception.code()).isSameAs(code);
    assertThat(exception.getCause()).isNull();
    assertThat(exception).hasMessage("fixture message");
  }

  @Test
  void codedExceptionRejectsMissingRequiredValues() {
    ErrorCode code = ErrorCode.of("TASK_INVALID");

    assertThatNullPointerException()
        .isThrownBy(() -> new TestCodedException(null, "fixture message"))
        .withMessage("code must not be null");
    assertThatNullPointerException()
        .isThrownBy(() -> new TestCodedException(code, null))
        .withMessage("message must not be null");
  }

  private static final class TestCodedException extends CodedException {

    private TestCodedException(ErrorCode code, String message) {
      super(code, message);
    }

    private TestCodedException(ErrorCode code, String message, Throwable cause) {
      super(code, message, cause);
    }
  }
}

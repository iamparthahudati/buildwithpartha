package tech.buildwithpartha.lifeos.common.error;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class ErrorContractsTests {

    @Test
    void createsStableUpperSnakeCaseCodes() {
        ErrorCode code = ErrorCode.of("TASK_NOT_FOUND");

        assertEquals("TASK_NOT_FOUND", code.value());
        assertEquals("TASK_NOT_FOUND", code.toString());
    }

    @Test
    void rejectsUnstableCodeFormats() {
        assertThrows(IllegalArgumentException.class, () -> ErrorCode.of("task-not-found"));
        assertThrows(IllegalArgumentException.class, () -> ErrorCode.of("TASK__NOT_FOUND"));
    }

    @Test
    void codedExceptionRetainsItsCodeAndCause() {
        ErrorCode code = ErrorCode.of("TASK_CONFLICT");
        IllegalStateException cause = new IllegalStateException("fixture cause");

        TestCodedException exception = new TestCodedException(code, "fixture message", cause);

        assertSame(code, exception.code());
        assertSame(cause, exception.getCause());
        assertEquals("fixture message", exception.getMessage());
    }

    private static final class TestCodedException extends CodedException {

        private TestCodedException(ErrorCode code, String message, Throwable cause) {
            super(code, message, cause);
        }
    }
}

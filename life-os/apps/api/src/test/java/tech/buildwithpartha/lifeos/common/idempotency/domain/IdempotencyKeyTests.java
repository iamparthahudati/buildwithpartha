package tech.buildwithpartha.lifeos.common.idempotency.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

class IdempotencyKeyTests {

  @ParameterizedTest
  @ValueSource(
      strings = {
        "12345678",
        "abc-def_ghi.123",
        "valid-key-001",
        "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6"
      })
  @DisplayName("Accepts valid 8-64 character ASCII idempotency keys")
  void acceptsValidKeys(String rawKey) {
    IdempotencyKey key = IdempotencyKey.of(rawKey);
    assertThat(key.value()).isEqualTo(rawKey);
    assertThat(IdempotencyKey.isValid(rawKey)).isTrue();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "short",
        "1234567",
        "-starts-with-dash",
        "_starts-with-underscore",
        ".starts-with-dot",
        "key with spaces",
        "key@with#symbols!",
        "key-longer-than-64-characters-0123456789012345678901234567890123456789"
      })
  @DisplayName("Rejects invalid keys with FieldValidationException")
  void rejectsInvalidKeys(String rawKey) {
    assertThatThrownBy(() -> IdempotencyKey.of(rawKey))
        .isInstanceOf(FieldValidationException.class);
    assertThat(IdempotencyKey.isValid(rawKey)).isFalse();
  }

  @Test
  @DisplayName("Rejects null key")
  void rejectsNullKey() {
    assertThatThrownBy(() -> IdempotencyKey.of(null)).isInstanceOf(NullPointerException.class);
    assertThat(IdempotencyKey.isValid(null)).isFalse();
  }
}

package tech.buildwithpartha.lifeos.common.idempotency.domain;

import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

/** Value object representing a validated HTTP Idempotency Key (8-64 safe ASCII chars). */
public record IdempotencyKey(String value) {

  private static final Pattern KEY_PATTERN = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$");

  public IdempotencyKey {
    Objects.requireNonNull(value, "idempotencyKey value must not be null");
    value = value.trim();
    if (!KEY_PATTERN.matcher(value).matches()) {
      throw new FieldValidationException(
          "Idempotency key must contain 8 to 64 safe ASCII characters",
          List.of(new FieldProblem("Idempotency-Key", "INVALID_IDEMPOTENCY_KEY")));
    }
  }

  public static boolean isValid(String rawKey) {
    if (rawKey == null) {
      return false;
    }
    return KEY_PATTERN.matcher(rawKey.trim()).matches();
  }

  public static IdempotencyKey of(String rawKey) {
    return new IdempotencyKey(rawKey);
  }
}

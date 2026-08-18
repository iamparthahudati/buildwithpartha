package tech.buildwithpartha.lifeos.auth.domain;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/** The outcome of checking a candidate password against the identity password policy. */
public record PasswordValidationResult(Set<PasswordPolicyViolation> violations) {

  public PasswordValidationResult {
    Objects.requireNonNull(violations, "violations must not be null");
    violations = violations.isEmpty() ? Set.of() : Set.copyOf(EnumSet.copyOf(violations));
  }

  public static PasswordValidationResult valid() {
    return new PasswordValidationResult(Set.of());
  }

  public static PasswordValidationResult of(Set<PasswordPolicyViolation> violations) {
    return new PasswordValidationResult(violations);
  }

  public boolean isValid() {
    return violations.isEmpty();
  }
}

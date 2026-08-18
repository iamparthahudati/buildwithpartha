package tech.buildwithpartha.lifeos.auth.domain;

import java.util.EnumSet;
import java.util.Set;

/**
 * Length bounds for a new or changed password.
 *
 * <p>{@code 06-SECURITY.md} calls for "password-length controls" and explicitly rules out arbitrary
 * periodic reset or composition rules, matching NIST SP 800-63B's length-over-complexity guidance.
 * {@link #MIN_LENGTH} is set above NIST's 8-character floor for meaningfully better resistance to
 * offline guessing; {@link #MAX_LENGTH} bounds the size of input Argon2id must process per attempt
 * without excluding realistic passphrases.
 *
 * <p>This class only checks length; whether a password is commonly exposed is a separate concern
 * that requires a data source and lives behind {@link CommonPasswordChecker}. {@code
 * auth.application.PasswordService} combines both into one {@link PasswordValidationResult}.
 */
public final class PasswordPolicy {

  public static final int MIN_LENGTH = 12;
  public static final int MAX_LENGTH = 128;

  private PasswordPolicy() {}

  public static Set<PasswordPolicyViolation> checkLength(RawPassword rawPassword) {
    EnumSet<PasswordPolicyViolation> violations = EnumSet.noneOf(PasswordPolicyViolation.class);
    int length = rawPassword.length();
    if (length < MIN_LENGTH) {
      violations.add(PasswordPolicyViolation.TOO_SHORT);
    }
    if (length > MAX_LENGTH) {
      violations.add(PasswordPolicyViolation.TOO_LONG);
    }
    return violations;
  }
}

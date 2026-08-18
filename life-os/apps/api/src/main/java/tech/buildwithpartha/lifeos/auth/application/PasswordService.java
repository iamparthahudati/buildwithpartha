package tech.buildwithpartha.lifeos.auth.application;

import java.util.EnumSet;
import java.util.Set;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.auth.domain.CommonPasswordChecker;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.PasswordPolicy;
import tech.buildwithpartha.lifeos.auth.domain.PasswordPolicyViolation;
import tech.buildwithpartha.lifeos.auth.domain.PasswordValidationResult;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/**
 * Validates and hashes a new or changed password. Used by signup (LOS-0503) and change-password
 * (LOS-0516); login verification is {@link PasswordAuthenticationService}.
 */
@Service
public class PasswordService {

  private final CommonPasswordChecker commonPasswordChecker;
  private final PasswordHasher passwordHasher;

  public PasswordService(
      CommonPasswordChecker commonPasswordChecker, PasswordHasher passwordHasher) {
    this.commonPasswordChecker = commonPasswordChecker;
    this.passwordHasher = passwordHasher;
  }

  /** Checks length and common-exposure policy together; does not hash. */
  public PasswordValidationResult validate(RawPassword rawPassword) {
    EnumSet<PasswordPolicyViolation> violations =
        EnumSet.copyOf(PasswordPolicy.checkLength(rawPassword));
    if (commonPasswordChecker.isCommon(rawPassword)) {
      violations.add(PasswordPolicyViolation.COMMONLY_EXPOSED);
    }
    return PasswordValidationResult.of(Set.copyOf(violations));
  }

  /**
   * Hashes {@code rawPassword} for storage. Callers must call {@link #validate(RawPassword)} first;
   * this method does not re-check policy so it can also be used to re-hash an already-validated
   * password on rehash-on-login.
   */
  public String hash(RawPassword rawPassword) {
    return passwordHasher.hash(rawPassword);
  }
}

package tech.buildwithpartha.lifeos.auth.application;

import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.PasswordVerification;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/**
 * Verifies a login attempt's password against the stored hash and carries the rehash-on-login path
 * LOS-0502 requires: when the password matches but the stored hash was produced with
 * weaker-than-current Argon2id parameters, this also computes the replacement hash so the future
 * login use case (LOS-0505) can persist it over the old one in the same transaction.
 */
@Service
public class PasswordAuthenticationService {

  private final PasswordHasher passwordHasher;

  public PasswordAuthenticationService(PasswordHasher passwordHasher) {
    this.passwordHasher = passwordHasher;
  }

  public PasswordVerification verify(RawPassword rawPassword, String storedHash) {
    if (!passwordHasher.matches(rawPassword, storedHash)) {
      return PasswordVerification.failed();
    }
    if (passwordHasher.needsRehash(storedHash)) {
      return PasswordVerification.matchedWithRehash(passwordHasher.hash(rawPassword));
    }
    return PasswordVerification.success();
  }
}

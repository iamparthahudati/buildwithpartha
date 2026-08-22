package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A port for screening a candidate password against known commonly-exposed passwords ({@code
 * 06-SECURITY.md}'s "breached/common-password screening").
 *
 * <p>Implemented in {@code auth.infrastructure} against a bundled wordlist so the check works
 * without a network call.
 */
public interface CommonPasswordChecker {

  boolean isCommon(RawPassword rawPassword);
}

package tech.buildwithpartha.lifeos.auth.domain;

/** A single reason a candidate password fails the identity password policy. */
public enum PasswordPolicyViolation {
  TOO_SHORT,
  TOO_LONG,
  COMMONLY_EXPOSED
}

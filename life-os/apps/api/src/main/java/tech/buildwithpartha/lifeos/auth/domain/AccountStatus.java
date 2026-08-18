package tech.buildwithpartha.lifeos.auth.domain;

/**
 * Mirrors the {@code ck_users_account_status} check constraint in {@code V2__identity_schema.sql}.
 */
public enum AccountStatus {
  UNVERIFIED,
  ACTIVE,
  SUSPENDED,
  DELETED
}

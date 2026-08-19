package tech.buildwithpartha.lifeos.auth.domain;

/** Mirrors the {@code ck_account_deletion_requests_status} check constraint. */
public enum AccountDeletionRequestStatus {
  GRACE_PERIOD,
  CANCELLED,
  PURGED
}

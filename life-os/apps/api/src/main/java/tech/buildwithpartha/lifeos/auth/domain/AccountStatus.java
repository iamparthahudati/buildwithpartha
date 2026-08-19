package tech.buildwithpartha.lifeos.auth.domain;

/**
 * Mirrors the {@code ck_users_account_status} check constraint in {@code V2__identity_schema.sql}.
 */
public enum AccountStatus {
  UNVERIFIED,
  ACTIVE,

  /**
   * Deletion has been requested and confirmed; the account is in its 30-day cancellable grace
   * period ({@code auth.domain.AccountDeletionGracePeriod}, LOS-0518). Inaccessible: {@code
   * LoginService} only authenticates {@link #ACTIVE} accounts.
   */
  PENDING_DELETION,
  SUSPENDED,
  DELETED
}

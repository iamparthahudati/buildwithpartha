package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code public.account_deletion_requests} row: tracks one account's 30-day cancellable
 * deletion grace period (LOS-0518, {@code 31-PRIVACY-DATA-LIFECYCLE.md}'s accepted ADR-012 state
 * machine — {@code ACTIVE -> DELETE_REQUESTED -> GRACE_PERIOD -> PURGE_IN_PROGRESS ->
 * PURGED_LIVE}).
 *
 * <p>Only {@link #cancellationTokenHash} is ever persisted; the raw value travels solely inside the
 * one outbound security-alert email, mirroring {@link EmailVerificationToken} and {@link
 * PasswordResetToken}. Unlike those, this row is deliberately kept — even {@link
 * AccountDeletionRequestStatus#PURGED} — as the minimal deletion evidence {@code
 * 31-PRIVACY-DATA-LIFECYCLE.md}'s R6/R8 retention classes allow (an opaque former account id and
 * timestamps only).
 */
public record AccountDeletionGracePeriod(
    UUID id,
    UUID userId,
    AccountDeletionRequestStatus status,
    String cancellationTokenHash,
    Instant requestedAt,
    Instant scheduledPurgeAt,
    Optional<Instant> cancelledAt,
    Optional<Instant> purgedAt,
    Instant createdAt) {

  /** 30 days proposed under ADR-012; a shorter, legally reviewed period may supersede this. */
  public static final Duration GRACE_PERIOD = Duration.ofDays(30);

  public AccountDeletionGracePeriod {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(cancellationTokenHash, "cancellationTokenHash must not be null");
    Objects.requireNonNull(requestedAt, "requestedAt must not be null");
    Objects.requireNonNull(scheduledPurgeAt, "scheduledPurgeAt must not be null");
    Objects.requireNonNull(cancelledAt, "cancelledAt must not be null");
    Objects.requireNonNull(purgedAt, "purgedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    if (cancellationTokenHash.isBlank()) {
      throw new IllegalArgumentException("cancellationTokenHash must not be blank");
    }
  }

  public static AccountDeletionGracePeriod request(
      UUID id, UUID userId, String cancellationTokenHash, Instant now) {
    return new AccountDeletionGracePeriod(
        id,
        userId,
        AccountDeletionRequestStatus.GRACE_PERIOD,
        cancellationTokenHash,
        now,
        now.plus(GRACE_PERIOD),
        Optional.empty(),
        Optional.empty(),
        now);
  }
}

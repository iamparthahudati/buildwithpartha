package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.User;

class AccountDeletionPurgeServiceTests {

  private static final Instant REQUESTED_AT = Instant.parse("2026-08-19T10:00:00Z");
  private static final Instant NOW = Instant.parse("2026-08-25T10:00:00Z");

  private FakeUserRepository userRepository;
  private FakeAccountDeletionGracePeriodRepository gracePeriodRepository;
  private AccountDeletionPurgeService service;

  private void setUp(Instant now) {
    userRepository = new FakeUserRepository();
    gracePeriodRepository = new FakeAccountDeletionGracePeriodRepository();
    service =
        new AccountDeletionPurgeService(
            gracePeriodRepository, userRepository, Clock.fixed(now, ZoneOffset.UTC));
  }

  private UUID seedPendingUser(Instant scheduledPurgeAt) {
    UUID userId = UUID.randomUUID();
    userRepository.save(
        new User(
            userId,
            EmailAddress.of(userId + "@example.test"),
            "Target User",
            "UTC",
            "en-US",
            1,
            AccountStatus.PENDING_DELETION,
            Optional.of(REQUESTED_AT),
            REQUESTED_AT,
            REQUESTED_AT,
            0L));
    gracePeriodRepository.save(
        new AccountDeletionGracePeriod(
            UUID.randomUUID(),
            userId,
            AccountDeletionRequestStatus.GRACE_PERIOD,
            "hash-" + userId,
            REQUESTED_AT,
            scheduledPurgeAt,
            Optional.empty(),
            Optional.empty(),
            REQUESTED_AT));
    return userId;
  }

  @Test
  void purgeDueAccounts_pastDeadline_deletesUserAndMarksRequestPurged() {
    setUp(NOW);
    UUID dueUserId = seedPendingUser(NOW.minusSeconds(1));

    int purged = service.purgeDueAccounts();

    assertThat(purged).isEqualTo(1);
    assertThat(userRepository.findById(dueUserId)).isEmpty();
    assertThat(gracePeriodRepository.all().get(0).status())
        .isEqualTo(AccountDeletionRequestStatus.PURGED);
  }

  @Test
  void purgeDueAccounts_notYetDue_leavesAccountUntouched() {
    setUp(NOW);
    UUID notDueUserId = seedPendingUser(NOW.plusSeconds(60));

    int purged = service.purgeDueAccounts();

    assertThat(purged).isZero();
    assertThat(userRepository.findById(notDueUserId)).isPresent();
    assertThat(gracePeriodRepository.all().get(0).status())
        .isEqualTo(AccountDeletionRequestStatus.GRACE_PERIOD);
  }

  @Test
  void purgeDueAccounts_noRequestsDue_returnsZero() {
    setUp(NOW);

    assertThat(service.purgeDueAccounts()).isZero();
  }
}

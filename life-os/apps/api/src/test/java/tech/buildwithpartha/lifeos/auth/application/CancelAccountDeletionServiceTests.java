package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.common.error.TokenAlreadyUsedException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.error.TokenInvalidException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;

class CancelAccountDeletionServiceTests {

  private static final Instant REQUESTED_AT = Instant.parse("2026-08-19T10:00:00Z");
  private static final Instant NOW = Instant.parse("2026-08-25T10:00:00Z");
  private static final RawToken TOKEN = RawToken.of("raw-cancel-token", "sha256:cancel-hash");

  private FakeUserRepository userRepository;
  private FakeAccountDeletionGracePeriodRepository gracePeriodRepository;
  private FakeTransactionalMailPort mailPort;
  private CancelAccountDeletionService service;
  private UUID userId;

  private void setUp(Instant now) {
    userRepository = new FakeUserRepository();
    gracePeriodRepository = new FakeAccountDeletionGracePeriodRepository();
    mailPort = new FakeTransactionalMailPort();
    userId = UUID.randomUUID();

    service =
        new CancelAccountDeletionService(
            gracePeriodRepository,
            userRepository,
            new FakeSecureTokenGenerator(TOKEN),
            mailPort,
            Clock.fixed(now, ZoneOffset.UTC));
  }

  private User seedPendingDeletionUser() {
    User user =
        new User(
            userId,
            EmailAddress.of("user@example.test"),
            "Target User",
            "UTC",
            "en-US",
            1,
            AccountStatus.PENDING_DELETION,
            Optional.of(REQUESTED_AT),
            REQUESTED_AT,
            REQUESTED_AT,
            0L);
    userRepository.save(user);
    return user;
  }

  private void seedGracePeriod() {
    gracePeriodRepository.save(
        AccountDeletionGracePeriod.request(UUID.randomUUID(), userId, TOKEN.hash(), REQUESTED_AT));
  }

  @Test
  void cancel_validTokenWithinGracePeriod_restoresAccountAndCancelsRequest() {
    setUp(NOW);
    seedPendingDeletionUser();
    seedGracePeriod();

    service.cancel(TOKEN.value());

    assertThat(userRepository.findById(userId).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.ACTIVE);
    assertThat(gracePeriodRepository.all().get(0).status())
        .isEqualTo(AccountDeletionRequestStatus.CANCELLED);
    assertThat(mailPort.all()).hasSize(1);
    assertThat(mailPort.all().get(0).kind()).isEqualTo(MailMessageKind.SECURITY_ALERT);
  }

  @Test
  void cancel_unknownToken_throwsTokenInvalidException() {
    setUp(NOW);

    assertThatThrownBy(() -> service.cancel(TOKEN.value()))
        .isInstanceOf(TokenInvalidException.class);
  }

  @Test
  void cancel_alreadyCancelled_throwsTokenAlreadyUsedException() {
    setUp(NOW);
    seedPendingDeletionUser();
    seedGracePeriod();
    service.cancel(TOKEN.value());

    assertThatThrownBy(() -> service.cancel(TOKEN.value()))
        .isInstanceOf(TokenAlreadyUsedException.class);
  }

  @Test
  void cancel_alreadyPurged_throwsTokenExpiredException() {
    setUp(NOW);
    seedPendingDeletionUser();
    seedGracePeriod();
    AccountDeletionGracePeriod gracePeriod = gracePeriodRepository.all().get(0);
    gracePeriodRepository.markPurgedIfInGracePeriod(gracePeriod.id(), NOW);

    assertThatThrownBy(() -> service.cancel(TOKEN.value()))
        .isInstanceOf(TokenExpiredException.class);
  }
}

package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.common.error.TokenAlreadyUsedException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.error.TokenInvalidException;

class EmailVerificationServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T12:00:00Z");

  @Test
  void aValidUnexpiredTokenActivatesTheAccountAndConsumesTheToken() {
    Fixture fixture = new Fixture();

    fixture.service.verify(new VerifyEmailCommand(fixture.rawToken.value()));

    User verified = fixture.users.findById(fixture.userId).orElseThrow();
    assertThat(verified.accountStatus()).isEqualTo(AccountStatus.ACTIVE);
    assertThat(verified.verifiedAt()).contains(NOW);

    EmailVerificationToken consumed =
        fixture.tokens.findByTokenHash(fixture.rawToken.hash()).orElseThrow();
    assertThat(consumed.consumedAt()).contains(NOW);
  }

  @Test
  void anUnknownTokenIsRejectedAsInvalidWithoutTouchingTheAccount() {
    Fixture fixture = new Fixture();

    assertThatThrownBy(() -> fixture.service.verify(new VerifyEmailCommand("not-the-real-token")))
        .isInstanceOf(TokenInvalidException.class);

    assertThat(fixture.users.findById(fixture.userId).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.UNVERIFIED);
  }

  @Test
  void anExpiredTokenIsRejectedAndLeftUnconsumed() {
    Fixture fixture = new Fixture(NOW.minus(Duration.ofHours(25)));

    assertThatThrownBy(
            () -> fixture.service.verify(new VerifyEmailCommand(fixture.rawToken.value())))
        .isInstanceOf(TokenExpiredException.class);

    EmailVerificationToken token =
        fixture.tokens.findByTokenHash(fixture.rawToken.hash()).orElseThrow();
    assertThat(token.consumedAt()).isEmpty();
    assertThat(fixture.users.findById(fixture.userId).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.UNVERIFIED);
  }

  @Test
  void anAlreadyConsumedTokenIsRejectedAsAlreadyUsedOnASecondAttempt() {
    Fixture fixture = new Fixture();
    fixture.service.verify(new VerifyEmailCommand(fixture.rawToken.value()));

    assertThatThrownBy(
            () -> fixture.service.verify(new VerifyEmailCommand(fixture.rawToken.value())))
        .isInstanceOf(TokenAlreadyUsedException.class);
  }

  @Test
  void losingTheConsumeRaceIsTreatedAsAlreadyUsedWithoutActivatingTheAccountTwice() {
    Fixture fixture = new Fixture();
    fixture.tokens.forceNextConsumeToLoseTheRace = true;

    assertThatThrownBy(
            () -> fixture.service.verify(new VerifyEmailCommand(fixture.rawToken.value())))
        .isInstanceOf(TokenAlreadyUsedException.class);

    assertThat(fixture.users.findById(fixture.userId).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.UNVERIFIED);
  }

  private static final class Fixture {

    private final FakeUserRepository users = new FakeUserRepository();
    private final FakeEmailVerificationTokenRepository tokens =
        new FakeEmailVerificationTokenRepository();
    private final RawToken rawToken = RawToken.of("raw-token-value", "sha256:fixture-hash");
    private final UUID userId = UUID.randomUUID();
    private final EmailVerificationService service;

    private Fixture() {
      this(NOW);
    }

    private Fixture(Instant tokenIssuedAt) {
      users.save(User.signup(userId, EmailAddress.of("pending@example.test"), "Pending", NOW));
      tokens.save(
          EmailVerificationToken.issue(UUID.randomUUID(), userId, rawToken.hash(), tokenIssuedAt));
      service =
          new EmailVerificationService(
              tokens,
              users,
              new FakeSecureTokenGenerator(rawToken),
              Clock.fixed(NOW, ZoneOffset.UTC));
    }
  }
}

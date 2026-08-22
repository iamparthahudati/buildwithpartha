package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.TokenAlreadyUsedException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.error.TokenInvalidException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;

class ResetPasswordServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T12:00:00Z");
  private static final String NEW_PASSWORD = "a genuinely unusual replacement passphrase 2026";

  @Test
  void aValidTokenAndCompliantPasswordRehashesRevokesSessionsAndSendsASecurityAlert() {
    Fixture fixture = new Fixture();
    User user = fixture.seedActiveUserWithTokenAndCredential("reset-target@example.test");
    fixture.seedSession(user.id());
    fixture.seedSession(user.id());

    fixture.service.reset(fixture.command(fixture.rawToken.value(), NEW_PASSWORD));

    Credential updated = fixture.credentials.all().get(fixture.credentials.all().size() - 1);
    assertThat(updated.passwordHash()).isEqualTo("hashed:" + NEW_PASSWORD);

    assertThat(fixture.sessions.all()).allSatisfy(s -> assertThat(s.revokedAt()).contains(NOW));

    PasswordResetToken consumed =
        fixture.tokens.findByTokenHash(fixture.rawToken.hash()).orElseThrow();
    assertThat(consumed.consumedAt()).contains(NOW);

    assertThat(fixture.mailPort.all()).hasSize(1);
    FakeTransactionalMailPort.Enqueued mail = fixture.mailPort.all().get(0);
    assertThat(mail.kind()).isEqualTo(MailMessageKind.SECURITY_ALERT);
    assertThat(mail.accountId()).isEqualTo(user.id());
  }

  @Test
  void anUnknownTokenIsRejectedAsInvalid() {
    Fixture fixture = new Fixture();

    assertThatThrownBy(
            () -> fixture.service.reset(fixture.command("not-the-real-token", NEW_PASSWORD)))
        .isInstanceOf(TokenInvalidException.class);
  }

  @Test
  void anExpiredTokenIsRejectedAndLeftUnconsumed() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUserWithTokenAndCredential(
        "reset-expired@example.test", NOW.minus(Duration.ofHours(2)));

    assertThatThrownBy(
            () -> fixture.service.reset(fixture.command(fixture.rawToken.value(), NEW_PASSWORD)))
        .isInstanceOf(TokenExpiredException.class);

    PasswordResetToken token =
        fixture.tokens.findByTokenHash(fixture.rawToken.hash()).orElseThrow();
    assertThat(token.consumedAt()).isEmpty();
  }

  @Test
  void anAlreadyConsumedTokenIsRejectedOnASecondAttempt() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUserWithTokenAndCredential("reset-twice@example.test");
    fixture.service.reset(fixture.command(fixture.rawToken.value(), NEW_PASSWORD));

    assertThatThrownBy(
            () ->
                fixture.service.reset(
                    fixture.command(fixture.rawToken.value(), "another passphrase 2026")))
        .isInstanceOf(TokenAlreadyUsedException.class);
  }

  @Test
  void aPolicyViolatingPasswordIsRejectedWithoutConsumingTheToken() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUserWithTokenAndCredential("reset-weak@example.test");

    assertThatThrownBy(
            () -> fixture.service.reset(fixture.command(fixture.rawToken.value(), "short")))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            exception -> {
              FieldValidationException fieldException = (FieldValidationException) exception;
              assertThat(fieldException.errors())
                  .extracting(problem -> problem.field() + ":" + problem.code())
                  .contains("newPassword:TOO_SHORT");
            });

    PasswordResetToken token =
        fixture.tokens.findByTokenHash(fixture.rawToken.hash()).orElseThrow();
    assertThat(token.consumedAt()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  @Test
  void losingTheConsumeRaceIsTreatedAsAlreadyUsedWithoutChangingThePassword() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUserWithTokenAndCredential("reset-race@example.test");
    fixture.tokens.forceNextConsumeToLoseTheRace = true;

    assertThatThrownBy(
            () -> fixture.service.reset(fixture.command(fixture.rawToken.value(), NEW_PASSWORD)))
        .isInstanceOf(TokenAlreadyUsedException.class);

    assertThat(fixture.credentials.all().get(0).passwordHash()).isEqualTo("legacy-hash");
  }

  private static final class Fixture {

    private final FakeUserRepository users = new FakeUserRepository();
    private final FakeCredentialRepository credentials = new FakeCredentialRepository();
    private final FakeSessionRepository sessions = new FakeSessionRepository();
    private final FakePasswordResetTokenRepository tokens = new FakePasswordResetTokenRepository();
    private final FakeTransactionalMailPort mailPort = new FakeTransactionalMailPort();
    private final RawToken rawToken = RawToken.of("raw-reset-token", "sha256:fixture-reset-hash");
    private final ResetPasswordService service =
        new ResetPasswordService(
            tokens,
            users,
            credentials,
            sessions,
            new PasswordService(new FakeCommonPasswordChecker(Set.of()), new FakePasswordHasher()),
            new FakeSecureTokenGenerator(rawToken),
            mailPort,
            Clock.fixed(NOW, ZoneOffset.UTC));

    private User seedActiveUserWithTokenAndCredential(String email) {
      return seedActiveUserWithTokenAndCredential(email, NOW);
    }

    private User seedActiveUserWithTokenAndCredential(String email, Instant tokenIssuedAt) {
      User user =
          User.signup(UUID.randomUUID(), EmailAddress.of(email), "Reset Target", NOW).verify(NOW);
      users.save(user);
      credentials.save(Credential.issue(UUID.randomUUID(), user.id(), "legacy-hash", NOW));
      tokens.save(
          PasswordResetToken.issue(UUID.randomUUID(), user.id(), rawToken.hash(), tokenIssuedAt));
      return user;
    }

    private Session seedSession(UUID userId) {
      return sessions.save(
          Session.issue(
              UUID.randomUUID(),
              userId,
              "sha256:session-" + UUID.randomUUID(),
              "sha256:csrf",
              NOW,
              Optional.empty()));
    }

    private ResetPasswordCommand command(String token, String newPassword) {
      return new ResetPasswordCommand(token, RawPassword.of(newPassword));
    }
  }
}

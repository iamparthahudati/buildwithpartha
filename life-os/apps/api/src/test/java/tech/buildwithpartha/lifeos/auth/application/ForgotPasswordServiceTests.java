package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

class ForgotPasswordServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T12:00:00Z");
  private static final LifeOsEnvironmentProperties ENVIRONMENT_PROPERTIES =
      new LifeOsEnvironmentProperties(
          URI.create("https://lifeos.example.test/life-os"), true, "lifeos@example.test");

  @Test
  void anActiveAccountGetsAResetTokenAndAResetEmail() {
    Fixture fixture = new Fixture();
    User active = fixture.seedActiveUser("reset-me@example.test");

    fixture.service.request(fixture.command("reset-me@example.test"));

    assertThat(fixture.tokens.all()).hasSize(1);
    assertThat(fixture.tokens.all().get(0).userId()).isEqualTo(active.id());
    assertThat(fixture.tokens.all().get(0).tokenHash()).isEqualTo(fixture.rawToken.hash());

    assertThat(fixture.mailPort.all()).hasSize(1);
    FakeTransactionalMailPort.Enqueued mail = fixture.mailPort.all().get(0);
    assertThat(mail.accountId()).isEqualTo(active.id());
    assertThat(mail.kind()).isEqualTo(MailMessageKind.PASSWORD_RESET);
    assertThat(mail.recipient().email()).isEqualTo("reset-me@example.test");
    assertThat(mail.templateVariables().asMap())
        .containsEntry(
            "resetUrl",
            "https://lifeos.example.test/life-os/reset-password?token=" + fixture.rawToken.value())
        .containsEntry("expiresInMinutes", "60");
  }

  @Test
  void anUnknownEmailCreatesNothingAndStillReturnsNormally() {
    Fixture fixture = new Fixture();

    fixture.service.request(fixture.command("nobody@example.test"));

    assertThat(fixture.tokens.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  @Test
  void anUnverifiedAccountGetsNoTokenOrEmailEither() {
    Fixture fixture = new Fixture();
    fixture.seedUnverifiedUser("pending@example.test");

    fixture.service.request(fixture.command("pending@example.test"));

    assertThat(fixture.tokens.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  @Test
  void rejectsTheRequestWhenTheRateLimiterDeniesItWithoutCreatingAnything() {
    Fixture fixture = new Fixture(new FakePasswordResetRateLimiter(false));
    fixture.seedActiveUser("limited@example.test");

    assertThatThrownBy(() -> fixture.service.request(fixture.command("limited@example.test")))
        .isInstanceOf(RateLimitedException.class);

    assertThat(fixture.tokens.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  private static final class Fixture {

    private final FakeUserRepository users = new FakeUserRepository();
    private final FakePasswordResetTokenRepository tokens = new FakePasswordResetTokenRepository();
    private final FakeTransactionalMailPort mailPort = new FakeTransactionalMailPort();
    private final RawToken rawToken = RawToken.of("raw-reset-token", "sha256:fixture-reset-hash");
    private final ForgotPasswordService service;

    private Fixture() {
      this(new FakePasswordResetRateLimiter(true));
    }

    private Fixture(FakePasswordResetRateLimiter rateLimiter) {
      service =
          new ForgotPasswordService(
              rateLimiter,
              users,
              tokens,
              new FakeSecureTokenGenerator(rawToken),
              mailPort,
              ENVIRONMENT_PROPERTIES,
              Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private User seedActiveUser(String email) {
      User user =
          User.signup(UUID.randomUUID(), EmailAddress.of(email), "Reset Me", NOW).verify(NOW);
      users.save(user);
      return user;
    }

    private void seedUnverifiedUser(String email) {
      users.save(User.signup(UUID.randomUUID(), EmailAddress.of(email), "Pending", NOW));
    }

    private ForgotPasswordCommand command(String email) {
      return new ForgotPasswordCommand(email, "203.0.113.1");
    }
  }
}

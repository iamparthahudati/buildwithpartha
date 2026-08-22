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

class ResendVerificationServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T12:00:00Z");
  private static final LifeOsEnvironmentProperties ENVIRONMENT_PROPERTIES =
      new LifeOsEnvironmentProperties(
          URI.create("https://lifeos.example.test/life-os"), true, "lifeos@example.test");

  @Test
  void anUnverifiedAccountGetsANewVerificationTokenAndVerificationEmail() {
    Fixture fixture = new Fixture();
    User unverified = fixture.seedUnverifiedUser("verify-me@example.test");

    fixture.service.resend(fixture.command("verify-me@example.test"));

    assertThat(fixture.tokens.all()).hasSize(1);
    assertThat(fixture.tokens.all().get(0).userId()).isEqualTo(unverified.id());
    assertThat(fixture.tokens.all().get(0).tokenHash()).isEqualTo(fixture.rawToken.hash());

    assertThat(fixture.mailPort.all()).hasSize(1);
    FakeTransactionalMailPort.Enqueued mail = fixture.mailPort.all().get(0);
    assertThat(mail.accountId()).isEqualTo(unverified.id());
    assertThat(mail.kind()).isEqualTo(MailMessageKind.EMAIL_VERIFICATION);
    assertThat(mail.recipient().email()).isEqualTo("verify-me@example.test");
    assertThat(mail.templateVariables().asMap())
        .containsEntry(
            "verificationUrl",
            "https://lifeos.example.test/life-os/verify-email?token=" + fixture.rawToken.value())
        .containsEntry("expiresInMinutes", "1440");
  }

  @Test
  void anUnknownEmailCreatesNothingAndStillReturnsNormally() {
    Fixture fixture = new Fixture();

    fixture.service.resend(fixture.command("nobody@example.test"));

    assertThat(fixture.tokens.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  @Test
  void anAlreadyActiveAccountGetsNoTokenOrEmailEither() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUser("active@example.test");

    fixture.service.resend(fixture.command("active@example.test"));

    assertThat(fixture.tokens.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  @Test
  void rejectsTheRequestWhenTheRateLimiterDeniesItWithoutCreatingAnything() {
    Fixture fixture = new Fixture(new FakeResendVerificationRateLimiter(false));
    fixture.seedUnverifiedUser("limited@example.test");

    assertThatThrownBy(() -> fixture.service.resend(fixture.command("limited@example.test")))
        .isInstanceOf(RateLimitedException.class);

    assertThat(fixture.tokens.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  private static final class Fixture {

    private final FakeUserRepository users = new FakeUserRepository();
    private final FakeEmailVerificationTokenRepository tokens =
        new FakeEmailVerificationTokenRepository();
    private final FakeTransactionalMailPort mailPort = new FakeTransactionalMailPort();
    private final RawToken rawToken = RawToken.of("raw-verify-token", "sha256:fixture-verify-hash");
    private final ResendVerificationService service;

    private Fixture() {
      this(new FakeResendVerificationRateLimiter(true));
    }

    private Fixture(FakeResendVerificationRateLimiter rateLimiter) {
      service =
          new ResendVerificationService(
              rateLimiter,
              users,
              tokens,
              new FakeSecureTokenGenerator(rawToken),
              mailPort,
              ENVIRONMENT_PROPERTIES,
              Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private User seedActiveUser(String email) {
      User user = User.signup(UUID.randomUUID(), EmailAddress.of(email), "Active", NOW).verify(NOW);
      users.save(user);
      return user;
    }

    private User seedUnverifiedUser(String email) {
      User user = User.signup(UUID.randomUUID(), EmailAddress.of(email), "Pending", NOW);
      users.save(user);
      return user;
    }

    private ResendVerificationCommand command(String email) {
      return new ResendVerificationCommand(email, "203.0.113.1");
    }
  }
}

package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

class SignupServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T12:00:00Z");
  private static final LifeOsEnvironmentProperties ENVIRONMENT_PROPERTIES =
      new LifeOsEnvironmentProperties(
          URI.create("https://lifeos.example.test/life-os"), true, "lifeos@example.test");
  private static final String STRONG_PASSWORD = "a genuinely unusual passphrase 2026";

  @Test
  void createsAnUnverifiedAccountAndEnqueuesVerificationMail() {
    Fixture fixture = new Fixture();

    fixture.service.signup(fixture.command("new@example.test", "  New User  "));

    assertThat(fixture.users.all()).hasSize(1);
    User created = fixture.users.all().get(0);
    assertThat(created.email().normalized()).isEqualTo("new@example.test");
    assertThat(created.displayName()).isEqualTo("New User");

    assertThat(fixture.credentials.all()).hasSize(1);
    assertThat(fixture.credentials.all().get(0).userId()).isEqualTo(created.id());

    assertThat(fixture.tokens.all()).hasSize(1);
    assertThat(fixture.tokens.all().get(0).tokenHash()).isEqualTo(fixture.rawToken.hash());

    assertThat(fixture.mailPort.all()).hasSize(1);
    FakeTransactionalMailPort.Enqueued mail = fixture.mailPort.all().get(0);
    assertThat(mail.accountId()).isEqualTo(created.id());
    assertThat(mail.kind()).isEqualTo(MailMessageKind.EMAIL_VERIFICATION);
    assertThat(mail.recipient().email()).isEqualTo("new@example.test");
    assertThat(mail.templateVariables().asMap())
        .containsEntry("displayName", "New User")
        .containsEntry(
            "verificationUrl",
            "https://lifeos.example.test/life-os/verify-email?token=" + fixture.rawToken.value())
        .containsEntry("expiresInMinutes", "1440");
  }

  @Test
  void recordsSeparateTermsAndPrivacyAcceptanceRows() {
    Fixture fixture = new Fixture();

    fixture.service.signup(fixture.command("new@example.test", "New User"));

    assertThat(fixture.terms.all())
        .extracting(TermsAcceptance::termsVersion)
        .containsExactlyInAnyOrder("terms:2026-08-01", "privacy:2026-08-01");
  }

  @Test
  void aDuplicateEmailCreatesNothingAndStillReturnsNormally() {
    Fixture fixture = new Fixture();
    fixture.service.signup(fixture.command("existing@example.test", "First"));
    assertThat(fixture.users.all()).hasSize(1);

    fixture.service.signup(fixture.command("existing@example.test", "Second Attempt"));

    assertThat(fixture.users.all()).hasSize(1);
    assertThat(fixture.credentials.all()).hasSize(1);
    assertThat(fixture.terms.all()).hasSize(2);
    assertThat(fixture.tokens.all()).hasSize(1);
    assertThat(fixture.mailPort.all()).hasSize(1);
  }

  @Test
  void rejectsAPasswordThatViolatesPolicyWithoutCreatingAnything() {
    Fixture fixture = new Fixture();
    SignupCommand command =
        new SignupCommand(
            "new@example.test",
            RawPassword.of("short"),
            "New User",
            "2026-08-01",
            "2026-08-01",
            "203.0.113.1");

    assertThatThrownBy(() -> fixture.service.signup(command))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            exception -> {
              FieldValidationException fieldException = (FieldValidationException) exception;
              assertThat(fieldException.errors())
                  .extracting(problem -> problem.field() + ":" + problem.code())
                  .contains("password:TOO_SHORT");
            });

    assertThat(fixture.users.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  @Test
  void rejectsSignupWhenTheRateLimiterDeniesItWithoutCreatingAnything() {
    Fixture fixture = new Fixture(new FakeSignupRateLimiter(false));

    assertThatThrownBy(() -> fixture.service.signup(fixture.command("new@example.test", "New")))
        .isInstanceOf(RateLimitedException.class);

    assertThat(fixture.users.all()).isEmpty();
    assertThat(fixture.mailPort.all()).isEmpty();
  }

  private static final class Fixture {

    private final FakeUserRepository users = new FakeUserRepository();
    private final FakeCredentialRepository credentials = new FakeCredentialRepository();
    private final FakeTermsAcceptanceRepository terms = new FakeTermsAcceptanceRepository();
    private final FakeEmailVerificationTokenRepository tokens =
        new FakeEmailVerificationTokenRepository();
    private final FakeTransactionalMailPort mailPort = new FakeTransactionalMailPort();
    private final RawToken rawToken = RawToken.of("raw-token-value", "sha256:fixture-hash");
    private final SignupService service;

    private Fixture() {
      this(new FakeSignupRateLimiter(true));
    }

    private Fixture(FakeSignupRateLimiter rateLimiter) {
      service =
          new SignupService(
              rateLimiter,
              new PasswordService(
                  new FakeCommonPasswordChecker(Set.of()), new FakePasswordHasher()),
              users,
              credentials,
              terms,
              tokens,
              new FakeSecureTokenGenerator(rawToken),
              mailPort,
              ENVIRONMENT_PROPERTIES,
              Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private SignupCommand command(String email, String displayName) {
      return new SignupCommand(
          email,
          RawPassword.of(STRONG_PASSWORD),
          displayName,
          "2026-08-01",
          "2026-08-01",
          "203.0.113.1");
    }
  }
}

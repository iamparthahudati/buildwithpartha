package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.common.error.InvalidCredentialsException;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;

class LoginServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T12:00:00Z");
  private static final String PASSWORD = "a genuinely unusual passphrase 2026";

  @Test
  void aCorrectPasswordForAnActiveAccountIssuesAFreshSessionAndCsrfToken() {
    Fixture fixture = new Fixture();
    User active = fixture.seedActiveUser("login@example.test", PASSWORD);

    LoginResult result = fixture.service.login(fixture.command("login@example.test", PASSWORD));

    assertThat(result.user().id()).isEqualTo(active.id());
    assertThat(fixture.sessions.all()).hasSize(1);
    assertThat(fixture.sessions.all().get(0).userId()).isEqualTo(active.id());
    assertThat(fixture.sessions.all().get(0).tokenHash()).isEqualTo(result.sessionToken().hash());
    assertThat(fixture.sessions.all().get(0).csrfSecretHash()).isEqualTo(result.csrfToken().hash());
    assertThat(result.sessionToken().value()).isNotEqualTo(result.csrfToken().value());
  }

  @Test
  void eachLoginIssuesADistinctSessionRatherThanReusingOne() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUser("rotate@example.test", PASSWORD);

    fixture.service.login(fixture.command("rotate@example.test", PASSWORD));
    fixture.service.login(fixture.command("rotate@example.test", PASSWORD));

    assertThat(fixture.sessions.all()).hasSize(2);
    assertThat(fixture.sessions.all().get(0).id()).isNotEqualTo(fixture.sessions.all().get(1).id());
    assertThat(fixture.sessions.all().get(0).tokenHash())
        .isNotEqualTo(fixture.sessions.all().get(1).tokenHash());
  }

  @Test
  void anUnknownEmailIsRejectedWithTheGenericFailureAndNoSessionIsCreated() {
    Fixture fixture = new Fixture();

    assertThatThrownBy(
            () -> fixture.service.login(fixture.command("nobody@example.test", PASSWORD)))
        .isInstanceOf(InvalidCredentialsException.class);

    assertThat(fixture.sessions.all()).isEmpty();
  }

  @Test
  void anUnverifiedAccountIsRejectedWithTheSameGenericFailureAsAnUnknownEmail() {
    Fixture fixture = new Fixture();
    fixture.seedUnverifiedUser("pending@example.test", PASSWORD);

    assertThatThrownBy(
            () -> fixture.service.login(fixture.command("pending@example.test", PASSWORD)))
        .isInstanceOf(InvalidCredentialsException.class);

    assertThat(fixture.sessions.all()).isEmpty();
  }

  @Test
  void aWrongPasswordIsRejectedWithTheSameGenericFailureAsAnUnknownEmail() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUser("wrong-password@example.test", PASSWORD);

    assertThatThrownBy(
            () -> fixture.service.login(fixture.command("wrong-password@example.test", "not it")))
        .isInstanceOf(InvalidCredentialsException.class);

    assertThat(fixture.sessions.all()).isEmpty();
  }

  @Test
  void rejectsLoginWhenTheRateLimiterDeniesItWithoutTouchingAnything() {
    Fixture fixture = new Fixture(new FakeLoginRateLimiter(false));
    fixture.seedActiveUser("limited@example.test", PASSWORD);

    assertThatThrownBy(
            () -> fixture.service.login(fixture.command("limited@example.test", PASSWORD)))
        .isInstanceOf(RateLimitedException.class);

    assertThat(fixture.sessions.all()).isEmpty();
  }

  @Test
  void aMatchingLegacyHashIsRehashedAndPersistedInTheSameLogin() {
    Fixture fixture = new Fixture();
    fixture.seedActiveUserWithLegacyHash("legacy@example.test", PASSWORD);

    fixture.service.login(fixture.command("legacy@example.test", PASSWORD));

    Credential stored = fixture.credentials.all().get(fixture.credentials.all().size() - 1);
    assertThat(stored.passwordHash()).isEqualTo("hashed:" + PASSWORD);
    assertThat(fixture.sessions.all()).hasSize(1);
  }

  private static final class Fixture {

    private final FakeUserRepository users = new FakeUserRepository();
    private final FakeCredentialRepository credentials = new FakeCredentialRepository();
    private final FakeSessionRepository sessions = new FakeSessionRepository();
    private final RawToken sessionToken = RawToken.of("session-raw-value", "sha256:session-hash");
    private final RawToken csrfToken = RawToken.of("csrf-raw-value", "sha256:csrf-hash");
    private final LoginService service;

    private Fixture() {
      this(new FakeLoginRateLimiter(true));
    }

    private Fixture(FakeLoginRateLimiter rateLimiter) {
      service =
          new LoginService(
              rateLimiter,
              users,
              credentials,
              new PasswordAuthenticationService(new FakePasswordHasher()),
              sessions,
              new FakeSecureTokenGenerator(sessionToken, csrfToken),
              Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private User seedActiveUser(String email, String password) {
      User user =
          User.signup(UUID.randomUUID(), EmailAddress.of(email), "Active User", NOW).verify(NOW);
      users.save(user);
      credentials.save(
          Credential.issue(
              UUID.randomUUID(),
              user.id(),
              new FakePasswordHasher().hash(RawPassword.of(password)),
              NOW));
      return user;
    }

    private void seedUnverifiedUser(String email, String password) {
      User user = User.signup(UUID.randomUUID(), EmailAddress.of(email), "Pending User", NOW);
      users.save(user);
      credentials.save(
          Credential.issue(
              UUID.randomUUID(),
              user.id(),
              new FakePasswordHasher().hash(RawPassword.of(password)),
              NOW));
    }

    private void seedActiveUserWithLegacyHash(String email, String password) {
      User user =
          User.signup(UUID.randomUUID(), EmailAddress.of(email), "Legacy User", NOW).verify(NOW);
      users.save(user);
      credentials.save(
          Credential.issue(
              UUID.randomUUID(),
              user.id(),
              FakePasswordHasher.legacyHashFor(RawPassword.of(password)),
              NOW));
    }

    private LoginCommand command(String email, String password) {
      return new LoginCommand(
          email, RawPassword.of(password), "203.0.113.1", Optional.of("JUnit/1.0"));
    }
  }
}

package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

class AccountDeletionServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();
  private static final String PASSWORD = "CorrectPassword123!";
  private static final LifeOsEnvironmentProperties ENVIRONMENT_PROPERTIES =
      new LifeOsEnvironmentProperties(
          URI.create("https://lifeos.example.test/life-os"), true, "lifeos@example.test");
  private static final RawToken CANCELLATION_TOKEN =
      RawToken.of("raw-cancel-token", "sha256:fixture-cancel-hash");

  private UserRepository userRepository;
  private CredentialRepository credentialRepository;
  private SessionRepository sessionRepository;
  private FakeAccountDeletionGracePeriodRepository gracePeriodRepository;
  private FakeBackgroundJobPort jobPort;
  private FakeTransactionalMailPort mailPort;
  private PasswordHasher passwordHasher;
  private AccountDeletionService service;

  @BeforeEach
  void setUp() {
    userRepository = new FakeUserRepository();
    credentialRepository = new FakeCredentialRepository();
    sessionRepository = new FakeSessionRepository();
    gracePeriodRepository = new FakeAccountDeletionGracePeriodRepository();
    jobPort = new FakeBackgroundJobPort();
    mailPort = new FakeTransactionalMailPort();
    passwordHasher = new PlainTextPasswordHasher();

    User user =
        new User(
            USER_ID,
            EmailAddress.of("user@example.test"),
            "Target User",
            "UTC",
            "en-US",
            1,
            AccountStatus.ACTIVE,
            Optional.of(NOW),
            NOW,
            NOW,
            0L);
    userRepository.save(user);

    Credential credential =
        Credential.issue(
            UUID.randomUUID(), USER_ID, passwordHasher.hash(RawPassword.of(PASSWORD)), NOW);
    credentialRepository.save(credential);

    Session session =
        new Session(
            UUID.randomUUID(),
            USER_ID,
            "sessionHash",
            "csrfHash",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.empty());
    sessionRepository.save(session);

    service =
        new AccountDeletionService(
            userRepository,
            credentialRepository,
            sessionRepository,
            gracePeriodRepository,
            passwordHasher,
            new FakeSecureTokenGenerator(CANCELLATION_TOKEN),
            jobPort,
            mailPort,
            ENVIRONMENT_PROPERTIES,
            Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void deleteAccount_validCredentialsAndEmailMatch_revokesSessionsAndEntersGracePeriod() {
    AccountDeletionOutcome outcome =
        service.deleteAccount(USER_ID, RawPassword.of(PASSWORD), "user@example.test");

    assertThat(outcome.requestedAt()).isEqualTo(NOW);
    assertThat(outcome.scheduledPurgeAt())
        .isEqualTo(NOW.plus(AccountDeletionGracePeriod.GRACE_PERIOD));

    // The account record survives, but is no longer ACTIVE (and so no longer authenticatable).
    assertThat(userRepository.findById(USER_ID)).isPresent();
    assertThat(userRepository.findById(USER_ID).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.PENDING_DELETION);
    assertThat(sessionRepository.findActiveSessionsByUserId(USER_ID, NOW)).isEmpty();

    assertThat(gracePeriodRepository.all()).hasSize(1);
    AccountDeletionGracePeriod gracePeriod = gracePeriodRepository.all().get(0);
    assertThat(gracePeriod.userId()).isEqualTo(USER_ID);
    assertThat(gracePeriod.cancellationTokenHash()).isEqualTo(CANCELLATION_TOKEN.hash());

    assertThat(jobPort.enqueuedJobs).hasSize(1);
    assertThat(jobPort.enqueuedJobs.get(0).kind()).isEqualTo(BackgroundJobKind.ACCOUNT_DELETION);

    assertThat(mailPort.all()).hasSize(1);
    assertThat(mailPort.all().get(0).kind()).isEqualTo(MailMessageKind.SECURITY_ALERT);
    assertThat(mailPort.all().get(0).templateVariables().asMap())
        .containsEntry(
            "cancelUrl",
            "https://lifeos.example.test/life-os/cancel-deletion?token="
                + CANCELLATION_TOKEN.value());
  }

  @Test
  void deleteAccount_validCredentialsAndNameMatch_succeeds() {
    AccountDeletionOutcome outcome =
        service.deleteAccount(USER_ID, RawPassword.of(PASSWORD), "Target User");
    assertThat(outcome.requestedAt()).isEqualTo(NOW);
  }

  @Test
  void deleteAccount_mismatchedConfirmation_throwsFieldValidationException() {
    assertThatThrownBy(() -> service.deleteAccount(USER_ID, RawPassword.of(PASSWORD), "Wrong Name"))
        .isInstanceOf(FieldValidationException.class)
        .hasMessageContaining("Confirmation text does not match");
  }

  @Test
  void deleteAccount_invalidPassword_throwsFieldValidationException() {
    assertThatThrownBy(
            () -> service.deleteAccount(USER_ID, RawPassword.of("WrongPassword!"), "Target User"))
        .isInstanceOf(FieldValidationException.class)
        .hasMessageContaining("Invalid current password");
  }

  private static final class PlainTextPasswordHasher implements PasswordHasher {
    @Override
    public String hash(RawPassword password) {
      return "hash:" + password.value();
    }

    @Override
    public boolean matches(RawPassword rawPassword, String hash) {
      return hash.equals("hash:" + rawPassword.value());
    }

    @Override
    public boolean needsRehash(String hash) {
      return false;
    }
  }

  private static final class FakeBackgroundJobPort implements BackgroundJobPort {
    record EnqueuedJob(UUID userId, BackgroundJobKind kind, String payload) {}

    final List<EnqueuedJob> enqueuedJobs = new ArrayList<>();

    @Override
    public UUID enqueue(UUID userId, BackgroundJobKind kind, String jsonPayload) {
      enqueuedJobs.add(new EnqueuedJob(userId, kind, jsonPayload));
      return UUID.randomUUID();
    }
  }
}

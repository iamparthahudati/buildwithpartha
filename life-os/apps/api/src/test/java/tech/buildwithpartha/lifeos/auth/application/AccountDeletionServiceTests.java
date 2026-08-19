package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailRecipient;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort;

class AccountDeletionServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();
  private static final String PASSWORD = "CorrectPassword123!";

  private UserRepository userRepository;
  private CredentialRepository credentialRepository;
  private SessionRepository sessionRepository;
  private FakeBackgroundJobPort jobPort;
  private FakeTransactionalMailPort mailPort;
  private PasswordHasher passwordHasher;
  private AccountDeletionService service;

  @BeforeEach
  void setUp() {
    userRepository = new FakeUserRepository();
    credentialRepository = new FakeCredentialRepository();
    sessionRepository = new FakeSessionRepository();
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
            passwordHasher,
            jobPort,
            mailPort,
            Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void deleteAccount_validCredentialsAndEmailMatch_revokesSessionsAndDeletesUser() {
    Instant deletedAt =
        service.deleteAccount(USER_ID, RawPassword.of(PASSWORD), "user@example.test");

    assertThat(deletedAt).isEqualTo(NOW);
    assertThat(userRepository.findById(USER_ID)).isEmpty();
    assertThat(sessionRepository.findActiveSessionsByUserId(USER_ID, NOW)).isEmpty();
    assertThat(jobPort.enqueuedJobs).hasSize(1);
    assertThat(jobPort.enqueuedJobs.get(0).kind()).isEqualTo(BackgroundJobKind.ACCOUNT_DELETION);
    assertThat(mailPort.enqueuedMessages).hasSize(1);
    assertThat(mailPort.enqueuedMessages.get(0).kind()).isEqualTo(MailMessageKind.SECURITY_ALERT);
  }

  @Test
  void deleteAccount_validCredentialsAndNameMatch_succeeds() {
    Instant deletedAt = service.deleteAccount(USER_ID, RawPassword.of(PASSWORD), "Target User");
    assertThat(deletedAt).isEqualTo(NOW);
    assertThat(userRepository.findById(USER_ID)).isEmpty();
  }

  @Test
  void deleteAccount_mismatchedConfirmation_throwsFieldValidationException() {
    assertThatThrownBy(
            () -> service.deleteAccount(USER_ID, RawPassword.of(PASSWORD), "Wrong Name"))
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

  private static final class FakeTransactionalMailPort implements TransactionalMailPort {
    record EnqueuedMessage(
        UUID accountId,
        MailMessageKind kind,
        MailRecipient recipient,
        MailTemplateVariables vars) {}

    final List<EnqueuedMessage> enqueuedMessages = new ArrayList<>();

    @Override
    public void enqueue(
        UUID accountId,
        MailMessageKind kind,
        MailRecipient recipient,
        MailTemplateVariables templateVariables) {
      enqueuedMessages.add(new EnqueuedMessage(accountId, kind, recipient, templateVariables));
    }
  }
}

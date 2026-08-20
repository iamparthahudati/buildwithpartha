package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;

class ChangePasswordServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

  private FakeUserRepository userRepository;
  private FakeCredentialRepository credentialRepository;
  private FakeSessionRepository sessionRepository;
  private FakePasswordHasher passwordHasher;
  private FakeCommonPasswordChecker commonPasswordChecker;
  private FakeSecureTokenGenerator tokenGenerator;
  private FakeTransactionalMailPort mailPort;
  private PasswordService passwordService;
  private PasswordAuthenticationService passwordAuthenticationService;
  private ChangePasswordService changePasswordService;

  private User user;
  private Credential credential;

  @BeforeEach
  void setUp() {
    userRepository = new FakeUserRepository();
    credentialRepository = new FakeCredentialRepository();
    sessionRepository = new FakeSessionRepository();
    passwordHasher = new FakePasswordHasher();
    commonPasswordChecker = new FakeCommonPasswordChecker(Set.of());
    tokenGenerator = new FakeSecureTokenGenerator();
    mailPort = new FakeTransactionalMailPort();

    passwordService = new PasswordService(commonPasswordChecker, passwordHasher);
    passwordAuthenticationService = new PasswordAuthenticationService(passwordHasher);

    changePasswordService =
        new ChangePasswordService(
            userRepository,
            credentialRepository,
            sessionRepository,
            passwordService,
            passwordAuthenticationService,
            tokenGenerator,
            mailPort,
            CLOCK);

    user =
        userRepository.save(
            User.signup(
                UUID.randomUUID(), EmailAddress.of("partha@example.test"), "Partha H", NOW));

    credential =
        credentialRepository.save(
            Credential.issue(
                UUID.randomUUID(),
                user.id(),
                passwordHasher.hash(RawPassword.of("OldPassword123!")),
                NOW));
  }

  @Test
  void changesPasswordSuccessfullyAndRevokesOtherSessions() {
    String currentRawToken = "current-session-token";
    Session currentSession =
        new Session(
            UUID.randomUUID(),
            user.id(),
            tokenGenerator.hash(currentRawToken),
            "csrf-hash",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Current Device"));
    sessionRepository.save(currentSession);

    Session otherSession =
        new Session(
            UUID.randomUUID(),
            user.id(),
            "other-token-hash",
            "csrf-hash-2",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Other Device"));
    sessionRepository.save(otherSession);

    changePasswordService.changePassword(
        new ChangePasswordCommand(
            user.id(),
            RawPassword.of("OldPassword123!"),
            RawPassword.of("NewSecretPassword456!"),
            Optional.of(currentRawToken)));

    Credential updated = credentialRepository.findByUserId(user.id()).orElseThrow();
    assertThat(
            passwordHasher.matches(RawPassword.of("NewSecretPassword456!"), updated.passwordHash()))
        .isTrue();

    assertThat(sessionRepository.findById(currentSession.id()).orElseThrow().isActive(NOW))
        .isTrue();
    assertThat(sessionRepository.findById(otherSession.id()).orElseThrow().isActive(NOW)).isFalse();

    assertThat(mailPort.all())
        .hasSize(1)
        .first()
        .satisfies(mail -> assertThat(mail.kind()).isEqualTo(MailMessageKind.SECURITY_ALERT));
  }

  @Test
  void changesPasswordWithoutCurrentSessionRevokesAllSessions() {
    Session otherSession =
        new Session(
            UUID.randomUUID(),
            user.id(),
            "other-token-hash",
            "csrf-hash-2",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Other Device"));
    sessionRepository.save(otherSession);

    changePasswordService.changePassword(
        new ChangePasswordCommand(
            user.id(),
            RawPassword.of("OldPassword123!"),
            RawPassword.of("NewSecretPassword456!"),
            Optional.empty()));

    assertThat(sessionRepository.findById(otherSession.id()).orElseThrow().isActive(NOW)).isFalse();
  }

  @Test
  void rejectsIncorrectCurrentPassword() {
    assertThatThrownBy(
            () ->
                changePasswordService.changePassword(
                    new ChangePasswordCommand(
                        user.id(),
                        RawPassword.of("WrongPassword123!"),
                        RawPassword.of("NewSecretPassword456!"),
                        Optional.empty())))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            ex -> {
              FieldValidationException fve = (FieldValidationException) ex;
              assertThat(fve.errors())
                  .anyMatch(
                      err ->
                          err.field().equals("currentPassword")
                              && err.code().equals("INVALID_CURRENT_PASSWORD"));
            });
  }

  @Test
  void rejectsNewPasswordFailingPolicy() {
    assertThatThrownBy(
            () ->
                changePasswordService.changePassword(
                    new ChangePasswordCommand(
                        user.id(),
                        RawPassword.of("OldPassword123!"),
                        RawPassword.of("short"),
                        Optional.empty())))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            ex -> {
              FieldValidationException fve = (FieldValidationException) ex;
              assertThat(fve.errors()).anyMatch(err -> err.field().equals("newPassword"));
            });
  }
}

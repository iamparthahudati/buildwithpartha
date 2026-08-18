package tech.buildwithpartha.lifeos.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UserTests {

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void signupSeedsSafeDefaultsForAnUnverifiedAccount() {
    UUID id = UUID.randomUUID();
    EmailAddress email = EmailAddress.of("New.User@Example.test");

    User user = User.signup(id, email, "New User", NOW);

    assertThat(user.id()).isEqualTo(id);
    assertThat(user.email()).isEqualTo(email);
    assertThat(user.displayName()).isEqualTo("New User");
    assertThat(user.timeZone()).isEqualTo(User.DEFAULT_TIME_ZONE);
    assertThat(user.locale()).isEqualTo(User.DEFAULT_LOCALE);
    assertThat(user.weekStart()).isEqualTo(User.DEFAULT_WEEK_START);
    assertThat(user.accountStatus()).isEqualTo(AccountStatus.UNVERIFIED);
    assertThat(user.verifiedAt()).isEmpty();
    assertThat(user.createdAt()).isEqualTo(NOW);
    assertThat(user.updatedAt()).isEqualTo(NOW);
    assertThat(user.version()).isZero();
  }

  @Test
  void rejectsABlankDisplayName() {
    assertThatThrownBy(
            () -> User.signup(UUID.randomUUID(), EmailAddress.of("a@example.test"), "  ", NOW))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void verifyActivatesAnUnverifiedAccountAndRecordsWhenItWasVerified() {
    User unverified = User.signup(UUID.randomUUID(), EmailAddress.of("a@example.test"), "A", NOW);
    Instant verifiedAt = NOW.plusSeconds(3600);

    User verified = unverified.verify(verifiedAt);

    assertThat(verified.accountStatus()).isEqualTo(AccountStatus.ACTIVE);
    assertThat(verified.verifiedAt()).contains(verifiedAt);
    assertThat(verified.updatedAt()).isEqualTo(verifiedAt);
    assertThat(verified.createdAt()).isEqualTo(NOW);
  }

  @Test
  void verifyIsANoOpOnceAlreadyActive() {
    User unverified = User.signup(UUID.randomUUID(), EmailAddress.of("a@example.test"), "A", NOW);
    User verified = unverified.verify(NOW.plusSeconds(3600));

    User verifiedAgain = verified.verify(NOW.plusSeconds(7200));

    assertThat(verifiedAgain).isEqualTo(verified);
  }

  @Test
  void rejectsAWeekStartOutsideOneToSeven() {
    EmailAddress email = EmailAddress.of("a@example.test");
    assertThatThrownBy(
            () ->
                new User(
                    UUID.randomUUID(),
                    email,
                    "Name",
                    "UTC",
                    "en-IN",
                    8,
                    AccountStatus.UNVERIFIED,
                    Optional.empty(),
                    NOW,
                    NOW,
                    0L))
        .isInstanceOf(IllegalArgumentException.class);
  }
}

package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

class AccountExportContributorTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  private UserRepository userRepository;
  private AccountExportContributor contributor;

  @BeforeEach
  void setUp() {
    userRepository = new FakeUserRepository();
    User user =
        new User(
            USER_ID,
            EmailAddress.of("test@example.test"),
            "Test Account",
            "Asia/Kolkata",
            "en-IN",
            1,
            AccountStatus.ACTIVE,
            Optional.of(NOW),
            NOW,
            NOW,
            0L);
    userRepository.save(user);
    contributor = new AccountExportContributor(userRepository);
  }

  @Test
  void exportFileName_returnsAccountJson() {
    assertThat(contributor.exportFileName()).isEqualTo("account.json");
  }

  @Test
  void exportDataForUser_serializesUserDataExcludingPassword() {
    byte[] jsonBytes = contributor.exportDataForUser(USER_ID);
    String json = new String(jsonBytes, StandardCharsets.UTF_8);

    assertThat(json)
        .contains("test@example.test")
        .contains("Test Account")
        .contains("Asia/Kolkata")
        .doesNotContain("password")
        .doesNotContain("secret");
  }
}

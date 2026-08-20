package tech.buildwithpartha.lifeos.user.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;

class UserTimeZoneAdapterTests {

  private UserProfileService userProfileService;
  private UserTimeZoneAdapter adapter;

  @BeforeEach
  void setUp() {
    userProfileService = mock(UserProfileService.class);
    adapter = new UserTimeZoneAdapter(userProfileService);
  }

  @Test
  void returnsUserTimeZoneWhenProfileExists() {
    UUID userId = UUID.randomUUID();
    UserProfile profile =
        new UserProfile(userId, "user@example.test", "User Name", "Asia/Kolkata", "en-IN", 1, 1L);
    given(userProfileService.getProfile(userId)).willReturn(profile);

    String timeZone = adapter.getUserTimeZone(userId);

    assertThat(timeZone).isEqualTo("Asia/Kolkata");
  }

  @Test
  void fallsBackToUtcWhenProfileNotFound() {
    UUID userId = UUID.randomUUID();
    given(userProfileService.getProfile(userId))
        .willThrow(new ResourceNotFoundException("User not found: " + userId));

    String timeZone = adapter.getUserTimeZone(userId);

    assertThat(timeZone).isEqualTo("UTC");
  }

  @Test
  void fallsBackToUtcWhenGenericExceptionThrown() {
    UUID userId = UUID.randomUUID();
    given(userProfileService.getProfile(userId)).willThrow(new RuntimeException("Database down"));

    String timeZone = adapter.getUserTimeZone(userId);

    assertThat(timeZone).isEqualTo("UTC");
  }

  @Test
  void fallsBackToUtcWhenUserIdIsNull() {
    String timeZone = adapter.getUserTimeZone(null);

    assertThat(timeZone).isEqualTo("UTC");
  }
}

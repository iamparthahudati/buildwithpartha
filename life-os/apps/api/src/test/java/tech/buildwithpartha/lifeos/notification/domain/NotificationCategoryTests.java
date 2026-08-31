package tech.buildwithpartha.lifeos.notification.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("NotificationCategory unit tests")
class NotificationCategoryTests {

  @Test
  @DisplayName("Parses valid categories case-insensitively and returns null for invalid inputs")
  void testParse() {
    assertThat(NotificationCategory.parse("DUE_REMINDER"))
        .isEqualTo(NotificationCategory.DUE_REMINDER);
    assertThat(NotificationCategory.parse("due_reminder"))
        .isEqualTo(NotificationCategory.DUE_REMINDER);
    assertThat(NotificationCategory.parse("  focus  ")).isEqualTo(NotificationCategory.FOCUS);
    assertThat(NotificationCategory.parse(null)).isNull();
    assertThat(NotificationCategory.parse("   ")).isNull();
    assertThat(NotificationCategory.parse("UNKNOWN_CATEGORY")).isNull();
  }
}

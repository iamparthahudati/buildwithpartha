package tech.buildwithpartha.lifeos.notification.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Notification aggregate root domain unit tests")
class NotificationDomainTests {

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-08-31T12:00:00Z");

  @Test
  @DisplayName("Rejects blank title and body")
  void validatesTitleAndBody() {
    assertThatThrownBy(
            () ->
                Notification.create(
                    userId, NotificationCategory.DUE_REMINDER, "  ", "Body", null, true, now))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("title must not be blank");

    assertThatThrownBy(
            () ->
                Notification.create(
                    userId, NotificationCategory.DUE_REMINDER, "Title", "  ", null, true, now))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("body must not be blank");
  }

  @Test
  @DisplayName("Calling markRead on already read notification returns same instance")
  void markReadIdempotent() {
    Notification created =
        Notification.create(
            userId, NotificationCategory.TIME_BLOCK, "Title", "Body", null, true, now);
    Notification read = created.markRead(now);
    Notification readAgain = read.markRead(now.plusSeconds(10));
    assertThat(readAgain).isSameAs(read);
  }

  @Test
  @DisplayName("Calling markUnread on already unread notification returns same instance")
  void markUnreadIdempotent() {
    Notification created =
        Notification.create(
            userId, NotificationCategory.TIME_BLOCK, "Title", "Body", null, true, now);
    Notification unreadAgain = created.markUnread();
    assertThat(unreadAgain).isSameAs(created);
  }
}

package tech.buildwithpartha.lifeos.note.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NoteDomainTests {

  @Test
  @DisplayName("Note record validates non-blank title and supports update/pin/archive operations")
  void testNoteInvariantsAndMutations() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();

    assertThatThrownBy(
            () ->
                new Note(
                    id, userId, "   ", "body", false, false, now, now, Set.of(), List.of(), 1L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Title must not be blank");

    Note note =
        new Note(id, userId, "Title", "Body", false, false, now, now, Set.of(), List.of(), 1L);

    // Test withUpdates with null parameters (triggers ternary false branches)
    Note updatedWithNulls = note.withUpdates(null, null, null, null, now.plusSeconds(10));
    assertThat(updatedWithNulls.title()).isEqualTo("Title");
    assertThat(updatedWithNulls.body()).isEqualTo("Body");
    assertThat(updatedWithNulls.labelIds()).isEmpty();
    assertThat(updatedWithNulls.links()).isEmpty();

    // Test withUpdates with new values
    UUID labelId = UUID.randomUUID();
    NoteLink link =
        new NoteLink(
            UUID.randomUUID(), id, userId, NoteLinkTargetType.TASK, UUID.randomUUID(), now);
    assertThat(link.isOwnedBy(userId)).isTrue();
    assertThat(link.isOwnedBy(UUID.randomUUID())).isFalse();
    Note updated =
        note.withUpdates(
            "New Title", "New Body", Set.of(labelId), List.of(link), now.plusSeconds(20));
    assertThat(updated.title()).isEqualTo("New Title");
    assertThat(updated.body()).isEqualTo("New Body");
    assertThat(updated.labelIds()).containsExactly(labelId);
    assertThat(updated.links()).containsExactly(link);

    // Test pin, unpin, archive, restore
    Note pinned = note.pin(now.plusSeconds(30));
    assertThat(pinned.pinned()).isTrue();

    Note unpinned = pinned.unpin(now.plusSeconds(40));
    assertThat(unpinned.pinned()).isFalse();

    Note archived = note.archive(now.plusSeconds(50));
    assertThat(archived.archived()).isTrue();

    Note restored = archived.restore(now.plusSeconds(60));
    assertThat(restored.archived()).isFalse();

    assertThat(note.toString()).contains("body=[REDACTED]");
  }
}

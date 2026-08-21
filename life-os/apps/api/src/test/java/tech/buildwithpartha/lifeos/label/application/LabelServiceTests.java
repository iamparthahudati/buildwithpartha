package tech.buildwithpartha.lifeos.label.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;

class LabelServiceTests {

  private LabelRepository labelRepository;
  private LabelService labelService;

  @BeforeEach
  void setUp() {
    labelRepository = Mockito.mock(LabelRepository.class);
    labelService = new LabelService(labelRepository);
  }

  @Test
  void createLabel_success() {
    UUID userId = UUID.randomUUID();
    CreateLabelCommand command = new CreateLabelCommand("  Urgent Task  ", "#FF0000");

    Mockito.when(labelRepository.findByUserIdAndNameNormalized(userId, "urgent task"))
        .thenReturn(Optional.empty());
    Mockito.when(labelRepository.save(any(Label.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    Label created = labelService.createLabel(userId, command);

    assertThat(created.name()).isEqualTo("Urgent Task");
    assertThat(created.nameNormalized()).isEqualTo("urgent task");
    assertThat(created.color()).isEqualTo("#FF0000");
    assertThat(created.userId()).isEqualTo(userId);
  }

  @Test
  void createLabel_blankName_throwsException() {
    UUID userId = UUID.randomUUID();
    CreateLabelCommand command = new CreateLabelCommand("   ", "#FF0000");

    assertThatThrownBy(() -> labelService.createLabel(userId, command))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void createLabel_duplicateName_throwsException() {
    UUID userId = UUID.randomUUID();
    CreateLabelCommand command = new CreateLabelCommand("Work", "#FF0000");
    Instant now = Instant.now();

    Label existing =
        new Label(UUID.randomUUID(), userId, "Work", "work", "#00FF00", now, now, 0L);
    Mockito.when(labelRepository.findByUserIdAndNameNormalized(userId, "work"))
        .thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> labelService.createLabel(userId, command))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void createLabel_invalidColor_throwsException() {
    UUID userId = UUID.randomUUID();
    CreateLabelCommand command =
        new CreateLabelCommand(
            "Work", "a-color-string-that-is-way-too-long-and-exceeds-thirty-characters");

    assertThatThrownBy(() -> labelService.createLabel(userId, command))
        .isInstanceOf(FieldValidationException.class);
  }


  @Test
  void getLabels_returnsUserLabels() {
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();
    Label label1 = new Label(UUID.randomUUID(), userId, "Work", "work", null, now, now, 0L);
    Label label2 = new Label(UUID.randomUUID(), userId, "Personal", "personal", null, now, now, 0L);

    Mockito.when(labelRepository.findByUserId(userId)).thenReturn(List.of(label1, label2));

    List<Label> labels = labelService.getLabels(userId);

    assertThat(labels).hasSize(2);
  }

  @Test
  void getLabelById_otherUser_throwsResourceNotFound() {
    UUID userId = UUID.randomUUID();
    UUID otherUserId = UUID.randomUUID();
    UUID labelId = UUID.randomUUID();
    Instant now = Instant.now();

    Label label = new Label(labelId, otherUserId, "Work", "work", null, now, now, 0L);
    Mockito.when(labelRepository.findById(labelId)).thenReturn(Optional.of(label));

    assertThatThrownBy(() -> labelService.getLabelById(userId, labelId))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void updateLabel_success() {
    UUID userId = UUID.randomUUID();
    UUID labelId = UUID.randomUUID();
    Instant now = Instant.now();

    Label existing = new Label(labelId, userId, "Old Name", "old name", "#000", now, now, 0L);
    Mockito.when(labelRepository.findById(labelId)).thenReturn(Optional.of(existing));
    Mockito.when(labelRepository.findByUserIdAndNameNormalized(userId, "new name"))
        .thenReturn(Optional.empty());
    Mockito.when(labelRepository.save(any(Label.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    UpdateLabelCommand command = new UpdateLabelCommand("New Name", "#FFF", 0L);
    Label updated = labelService.updateLabel(userId, labelId, command);

    assertThat(updated.name()).isEqualTo("New Name");
    assertThat(updated.nameNormalized()).isEqualTo("new name");
    assertThat(updated.color()).isEqualTo("#FFF");
  }

  @Test
  void updateLabel_versionMismatch_throwsConcurrencyConflict() {
    UUID userId = UUID.randomUUID();
    UUID labelId = UUID.randomUUID();
    Instant now = Instant.now();

    Label existing = new Label(labelId, userId, "Work", "work", null, now, now, 1L);
    Mockito.when(labelRepository.findById(labelId)).thenReturn(Optional.of(existing));

    UpdateLabelCommand command = new UpdateLabelCommand("Work Updated", null, 0L);

    assertThatThrownBy(() -> labelService.updateLabel(userId, labelId, command))
        .isInstanceOf(ConcurrencyConflictException.class);
  }

  @Test
  void deleteLabel_withoutReplacement_deletesLabel() {
    UUID userId = UUID.randomUUID();
    UUID labelId = UUID.randomUUID();
    Instant now = Instant.now();

    Label existing = new Label(labelId, userId, "Work", "work", null, now, now, 0L);
    Mockito.when(labelRepository.findById(labelId)).thenReturn(Optional.of(existing));

    labelService.deleteLabel(userId, labelId, Optional.empty());

    Mockito.verify(labelRepository).delete(existing);
  }

  @Test
  void deleteLabel_withReplacement_callsDeleteWithReplacement() {
    UUID userId = UUID.randomUUID();
    UUID labelId = UUID.randomUUID();
    UUID replaceId = UUID.randomUUID();
    Instant now = Instant.now();

    Label target = new Label(labelId, userId, "Work", "work", null, now, now, 0L);
    Label replacement = new Label(replaceId, userId, "Job", "job", null, now, now, 0L);

    Mockito.when(labelRepository.findById(labelId)).thenReturn(Optional.of(target));
    Mockito.when(labelRepository.findById(replaceId)).thenReturn(Optional.of(replacement));

    labelService.deleteLabel(userId, labelId, Optional.of(replaceId));

    Mockito.verify(labelRepository).deleteWithReplacement(userId, labelId, replaceId);
  }

  @Test
  void deleteLabel_replaceWithSelf_throwsException() {
    UUID userId = UUID.randomUUID();
    UUID labelId = UUID.randomUUID();
    Instant now = Instant.now();

    Label target = new Label(labelId, userId, "Work", "work", null, now, now, 0L);
    Mockito.when(labelRepository.findById(labelId)).thenReturn(Optional.of(target));

    assertThatThrownBy(() -> labelService.deleteLabel(userId, labelId, Optional.of(labelId)))
        .isInstanceOf(FieldValidationException.class);
  }
}

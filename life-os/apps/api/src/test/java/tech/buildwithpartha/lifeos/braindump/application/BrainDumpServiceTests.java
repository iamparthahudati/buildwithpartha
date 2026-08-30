package tech.buildwithpartha.lifeos.braindump.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemRepository;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemStatus;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToGoalCommand;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToNoteCommand;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToProjectCommand;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToTaskCommand;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.goal.BrainDumpGoalCreator;
import tech.buildwithpartha.lifeos.common.note.BrainDumpNoteCreator;
import tech.buildwithpartha.lifeos.common.project.BrainDumpProjectCreator;
import tech.buildwithpartha.lifeos.common.task.BrainDumpTaskCreator;

@DisplayName("Brain Dump service")
class BrainDumpServiceTests {

  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final UUID ITEM_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
  private static final UUID TARGET_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
  private static final Instant NOW = Instant.parse("2026-08-30T10:00:00Z");

  private BrainDumpItemRepository repository;
  private BrainDumpTaskCreator taskCreator;
  private BrainDumpNoteCreator noteCreator;
  private BrainDumpProjectCreator projectCreator;
  private BrainDumpGoalCreator goalCreator;
  private BrainDumpService service;

  @BeforeEach
  void setUp() {
    repository = mock(BrainDumpItemRepository.class);
    taskCreator = mock(BrainDumpTaskCreator.class);
    noteCreator = mock(BrainDumpNoteCreator.class);
    projectCreator = mock(BrainDumpProjectCreator.class);
    goalCreator = mock(BrainDumpGoalCreator.class);
    service =
        new BrainDumpService(
            repository,
            taskCreator,
            noteCreator,
            projectCreator,
            goalCreator,
            Clock.fixed(NOW, ZoneOffset.UTC));
    when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void coversCaptureOwnershipLifecycleAndVersionConflict() {
    BrainDumpItem item = item();
    when(repository.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(Optional.of(item));

    assertThat(service.capture(USER_ID, new CaptureBrainDumpCommand("Capture")))
        .satisfies(saved -> assertThat(saved.userId()).isEqualTo(USER_ID));
    assertThat(service.getItem(USER_ID, ITEM_ID)).isEqualTo(item);
    assertThat(service.updateContent(USER_ID, ITEM_ID, new UpdateBrainDumpContentCommand("New"), 0))
        .extracting(BrainDumpItem::content)
        .isEqualTo("New");
    assertThat(service.defer(USER_ID, ITEM_ID, 0).status()).isEqualTo(BrainDumpItemStatus.DEFERRED);
    assertThat(service.archive(USER_ID, ITEM_ID, 0).archivedAt()).contains(NOW);
    assertThat(service.restore(USER_ID, ITEM_ID, 0).archivedAt()).isEmpty();
    service.delete(USER_ID, ITEM_ID);
    verify(repository).delete(item);

    assertThatThrownBy(
            () ->
                service.updateContent(
                    USER_ID, ITEM_ID, new UpdateBrainDumpContentCommand("New"), 1))
        .isInstanceOf(ConcurrencyConflictException.class);
    when(repository.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.getItem(USER_ID, ITEM_ID))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void conversionsCreateEachTargetOnceAndRetriesReturnTheOriginalConversion() {
    BrainDumpItem item = item();
    when(repository.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(Optional.of(item));
    when(taskCreator.createTask(any(), any())).thenReturn(TARGET_ID);
    when(noteCreator.createNote(any(), any())).thenReturn(TARGET_ID);
    when(projectCreator.createProject(any(), any())).thenReturn(TARGET_ID);
    when(goalCreator.createGoal(any(), any())).thenReturn(TARGET_ID);

    assertThat(service.convertToTask(USER_ID, ITEM_ID, taskCommand(), 0).convertedToType())
        .contains("TASK");
    assertThat(service.convertToNote(USER_ID, ITEM_ID, noteCommand(), 0).convertedToType())
        .contains("NOTE");
    assertThat(service.convertToProject(USER_ID, ITEM_ID, projectCommand(), 0).convertedToType())
        .contains("PROJECT");
    assertThat(service.convertToGoal(USER_ID, ITEM_ID, goalCommand(), 0).convertedToType())
        .contains("GOAL");

    BrainDumpItem converted = item.convert("TASK", TARGET_ID, NOW);
    when(repository.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(Optional.of(converted));
    assertThat(service.convertToTask(USER_ID, ITEM_ID, taskCommand(), 99)).isSameAs(converted);
    assertThat(service.convertToNote(USER_ID, ITEM_ID, noteCommand(), 99)).isSameAs(converted);
    assertThat(service.convertToProject(USER_ID, ITEM_ID, projectCommand(), 99))
        .isSameAs(converted);
    assertThat(service.convertToGoal(USER_ID, ITEM_ID, goalCommand(), 99)).isSameAs(converted);

    verify(taskCreator).createTask(USER_ID, taskCommand());
    verify(noteCreator).createNote(USER_ID, noteCommand());
    verify(projectCreator).createProject(USER_ID, projectCommand());
    verify(goalCreator).createGoal(USER_ID, goalCommand());
  }

  private static BrainDumpItem item() {
    return new BrainDumpItem(
        ITEM_ID,
        USER_ID,
        "Capture",
        BrainDumpItemStatus.UNPROCESSED,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        NOW.minusSeconds(60),
        NOW.minusSeconds(60),
        0);
  }

  private static ConvertToTaskCommand taskCommand() {
    return new ConvertToTaskCommand(
        "Task", Optional.empty(), Optional.empty(), Optional.empty(), "P2", Set.of());
  }

  private static ConvertToNoteCommand noteCommand() {
    return new ConvertToNoteCommand("Note", "Body", Set.of());
  }

  private static ConvertToProjectCommand projectCommand() {
    return new ConvertToProjectCommand(
        "Project",
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        "P2",
        Optional.empty(),
        Optional.empty(),
        Set.of());
  }

  private static ConvertToGoalCommand goalCommand() {
    return new ConvertToGoalCommand(
        "Goal",
        Optional.empty(),
        "PERSONAL",
        "BINARY",
        Optional.empty(),
        Optional.empty(),
        "WEEKLY");
  }
}

package tech.buildwithpartha.lifeos.braindump.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.braindump.application.BrainDumpService;
import tech.buildwithpartha.lifeos.braindump.application.CaptureBrainDumpCommand;
import tech.buildwithpartha.lifeos.braindump.application.UpdateBrainDumpContentCommand;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQueryResult;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

@DisplayName("Brain Dump API contracts")
class BrainDumpApiContractTests {

  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  @Test
  void validatesEveryQueryBoundaryAndParsesOptionalStatus() {
    BrainDumpService service = mock(BrainDumpService.class);
    BrainDumpController controller = new BrainDumpController(service);
    when(service.listItems(any())).thenReturn(new BrainDumpItemQueryResult(List.of(), 0));

    assertThat(controller.queryItems(USER_ID, null, null, null, 0, 20, "updatedAt", "DESC").items())
        .isEmpty();
    assertThat(
            controller
                .queryItems(USER_ID, " find ", "deferred", false, 0, 100, "content", "ASC")
                .items())
        .isEmpty();

    assertInvalidQuery(controller, -1, 20, "updatedAt", "DESC", null);
    assertInvalidQuery(controller, 0, 0, "updatedAt", "DESC", null);
    assertInvalidQuery(controller, 0, 101, "updatedAt", "DESC", null);
    assertInvalidQuery(controller, 0, 20, "unknown", "DESC", null);
    assertInvalidQuery(controller, 0, 20, "updatedAt", "sideways", null);
    assertInvalidQuery(controller, 0, 20, "updatedAt", "DESC", "unknown");
  }

  @Test
  void defaultsNullableConversionCollectionsAndOptionalsWithoutChangingProvidedValues() {
    UUID targetId = UUID.randomUUID();
    Set<UUID> labels = Set.of(UUID.randomUUID());
    Instant dueAt = Instant.parse("2026-08-30T10:00:00Z");
    LocalDate date = LocalDate.of(2026, 9, 1);

    assertThat(new ConvertToNoteRequest("Title", "Body", null, 0).toCommand().labelIds()).isEmpty();
    assertThat(new ConvertToNoteRequest("Title", "Body", labels, 0).toCommand().labelIds())
        .isEqualTo(labels);

    ConvertToTaskRequest emptyTask =
        new ConvertToTaskRequest("Task", null, null, null, "P2", null, 0);
    assertThat(emptyTask.toCommand().description()).isEmpty();
    assertThat(emptyTask.toCommand().projectId()).isEmpty();
    assertThat(emptyTask.toCommand().dueAt()).isEmpty();
    assertThat(emptyTask.toCommand().labelIds()).isEmpty();
    ConvertToTaskRequest fullTask =
        new ConvertToTaskRequest(
            "Task",
            Optional.of("Description"),
            Optional.of(targetId),
            Optional.of(dueAt),
            "P1",
            labels,
            0);
    assertThat(fullTask.toCommand().projectId()).contains(targetId);

    ConvertToProjectRequest emptyProject =
        new ConvertToProjectRequest("Project", null, null, null, "P2", null, null, null, 0);
    assertThat(emptyProject.toCommand().description()).isEmpty();
    assertThat(emptyProject.toCommand().startDate()).isEmpty();
    assertThat(emptyProject.toCommand().deadlineDate()).isEmpty();
    assertThat(emptyProject.toCommand().color()).isEmpty();
    assertThat(emptyProject.toCommand().icon()).isEmpty();
    assertThat(emptyProject.toCommand().labelIds()).isEmpty();
    ConvertToProjectRequest fullProject =
        new ConvertToProjectRequest(
            "Project",
            Optional.of("Description"),
            Optional.of(date),
            Optional.of(date.plusDays(1)),
            "P1",
            Optional.of("blue"),
            Optional.of("rocket"),
            labels,
            0);
    assertThat(fullProject.toCommand().deadlineDate()).contains(date.plusDays(1));

    ConvertToGoalRequest emptyGoal =
        new ConvertToGoalRequest("Goal", null, "PERSONAL", "NUMERIC", null, null, "WEEKLY", 0);
    assertThat(emptyGoal.toCommand().description()).isEmpty();
    assertThat(emptyGoal.toCommand().targetValue()).isEmpty();
    assertThat(emptyGoal.toCommand().targetDate()).isEmpty();
    ConvertToGoalRequest fullGoal =
        new ConvertToGoalRequest(
            "Goal",
            Optional.of("Description"),
            "PERSONAL",
            "NUMERIC",
            Optional.of(BigDecimal.TEN),
            Optional.of(date),
            "WEEKLY",
            0);
    assertThat(fullGoal.toCommand().targetValue()).contains(BigDecimal.TEN);
  }

  @Test
  void rejectsBlankDomainCommandsAndAcceptsTrimmedContent() {
    assertThat(new CaptureBrainDumpCommand(" capture ").content()).isEqualTo(" capture ");
    assertThat(new UpdateBrainDumpContentCommand(" update ").content()).isEqualTo(" update ");
    assertThatThrownBy(() -> new CaptureBrainDumpCommand("  "))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new UpdateBrainDumpContentCommand("\n"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private static void assertInvalidQuery(
      BrainDumpController controller,
      int page,
      int size,
      String sortBy,
      String sortDirection,
      String status) {
    assertThatThrownBy(
            () ->
                controller.queryItems(
                    USER_ID, null, status, null, page, size, sortBy, sortDirection))
        .isInstanceOf(FieldValidationException.class);
  }
}

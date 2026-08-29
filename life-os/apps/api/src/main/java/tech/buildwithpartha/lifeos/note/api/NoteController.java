package tech.buildwithpartha.lifeos.note.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.note.application.NoteService;
import tech.buildwithpartha.lifeos.note.domain.Note;
import tech.buildwithpartha.lifeos.note.domain.NoteQuery;
import tech.buildwithpartha.lifeos.note.domain.NoteQueryResult;

/** Controller exposing REST endpoints for managing Notes (LOS-1201). */
@RestController
@RequestMapping("/notes")
@SecurityRequirement(name = "sessionCookie")
public class NoteController {

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("title", "pinned", "archived", "createdAt", "updatedAt");

  private final NoteService noteService;

  public NoteController(NoteService noteService) {
    this.noteService = noteService;
  }

  @Operation(summary = "Query notes", description = "Search, filter, and paginate user notes.")
  @ApiResponse(responseCode = "200", description = "Query results.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public PageResponse<NoteResponse> queryNotes(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "q", required = false) String q,
      @RequestParam(name = "pinned", required = false) Boolean pinned,
      @RequestParam(name = "archived", required = false) Boolean archived,
      @RequestParam(name = "labelId", required = false) Set<UUID> labelIds,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size,
      @RequestParam(name = "sortBy", required = false, defaultValue = "updatedAt") String sortBy,
      @RequestParam(name = "sortDirection", required = false, defaultValue = "DESC")
          String sortDirection) {

    if (page < 0) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("page", "INVALID")));
    }
    if (size < 1 || size > 100) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("size", "INVALID")));
    }
    if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("sortBy", "INVALID")));
    }
    if (!"ASC".equalsIgnoreCase(sortDirection) && !"DESC".equalsIgnoreCase(sortDirection)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("sortDirection", "INVALID")));
    }

    Set<UUID> targetLabelIds = labelIds != null ? labelIds : Set.of();

    NoteQuery query =
        new NoteQuery(
            userId, q, pinned, archived, targetLabelIds, page, size, sortBy, sortDirection);

    NoteQueryResult queryResult = noteService.queryNotes(query);

    List<NoteResponse> items = queryResult.notes().stream().map(NoteResponse::fromDomain).toList();

    return PageResponse.of(items, page, size, queryResult.totalItems());
  }

  @Operation(summary = "Create note", description = "Creates a new user-owned Note.")
  @ApiResponse(responseCode = "201", description = "Note created successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  public ResponseEntity<NoteResponse> createNote(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateNoteRequest request) {
    Note created = noteService.createNote(userId, request.toCommand());
    NoteResponse response = NoteResponse.fromDomain(created);
    URI location = URI.create("/life-os/api/v1/notes/" + created.id());
    return ResponseEntity.created(location).body(response);
  }

  @Operation(summary = "Get note", description = "Retrieves an existing note by ID.")
  @ApiResponse(responseCode = "200", description = "Note details.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}")
  public NoteResponse getNote(@AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    Note note = noteService.getNote(userId, id);
    return NoteResponse.fromDomain(note);
  }

  @Operation(summary = "Update note", description = "Updates an existing Note.")
  @ApiResponse(responseCode = "200", description = "Note updated successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}")
  public NoteResponse updateNote(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateNoteRequest request) {
    Note updated = noteService.updateNote(userId, id, request.toCommand(), request.version());
    return NoteResponse.fromDomain(updated);
  }

  @Operation(summary = "Delete note", description = "Deletes an existing Note.")
  @ApiResponse(responseCode = "204", description = "Note deleted successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteNote(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    noteService.deleteNote(userId, id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Pin note", description = "Pins an existing Note.")
  @ApiResponse(responseCode = "200", description = "Note pinned successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/pin")
  public NoteResponse pinNote(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody PinNoteRequest request) {
    Note note = noteService.pinNote(userId, id, request.version());
    return NoteResponse.fromDomain(note);
  }

  @Operation(summary = "Unpin note", description = "Unpins an existing Note.")
  @ApiResponse(responseCode = "200", description = "Note unpinned successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/unpin")
  public NoteResponse unpinNote(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UnpinNoteRequest request) {
    Note note = noteService.unpinNote(userId, id, request.version());
    return NoteResponse.fromDomain(note);
  }

  @Operation(summary = "Archive note", description = "Archives an existing Note.")
  @ApiResponse(responseCode = "200", description = "Note archived successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/archive")
  public NoteResponse archiveNote(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ArchiveNoteRequest request) {
    Note note = noteService.archiveNote(userId, id, request.version());
    return NoteResponse.fromDomain(note);
  }

  @Operation(summary = "Restore note", description = "Restores an archived Note.")
  @ApiResponse(responseCode = "200", description = "Note restored successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/restore")
  public NoteResponse restoreNote(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody RestoreNoteRequest request) {
    Note note = noteService.restoreNote(userId, id, request.version());
    return NoteResponse.fromDomain(note);
  }
}

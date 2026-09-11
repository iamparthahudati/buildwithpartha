package tech.buildwithpartha.lifeos.note.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.note.domain.Note;
import tech.buildwithpartha.lifeos.note.domain.NoteLink;
import tech.buildwithpartha.lifeos.note.domain.NoteRepository;

/** Contributes personal notes and note links to user data export archives (LOS-1512). */
@Component
public class NoteExportContributor implements UserDataExportContributor {

  private final NoteRepository noteRepository;
  private final ObjectMapper objectMapper;

  public NoteExportContributor(NoteRepository noteRepository) {
    this.noteRepository = noteRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "notes.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Note> notes = noteRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Note note : notes) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", note.id().toString());
      data.put("title", note.title());
      data.put("body", note.body());
      data.put("pinned", note.pinned());
      data.put("archived", note.archived());
      data.put("createdAt", note.createdAt().toString());
      data.put("updatedAt", note.updatedAt().toString());
      data.put("labelIds", note.labelIds().stream().map(UUID::toString).toList());

      List<Map<String, Object>> linkRecords = new ArrayList<>();
      for (NoteLink link : note.links()) {
        Map<String, Object> linkData = new LinkedHashMap<>();
        linkData.put("id", link.id().toString());
        linkData.put("targetType", link.targetType().name());
        linkData.put("targetId", link.targetId().toString());
        linkData.put("createdAt", link.createdAt().toString());
        linkRecords.add(linkData);
      }
      data.put("links", linkRecords);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize notes export data", e);
    }
  }
}

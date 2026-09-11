package tech.buildwithpartha.lifeos.comment.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentRepository;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

/** Contributes task and project comments to user data export archives (LOS-1512). */
@Component
public class CommentExportContributor implements UserDataExportContributor {

  private final CommentRepository commentRepository;
  private final ObjectMapper objectMapper;

  public CommentExportContributor(CommentRepository commentRepository) {
    this.commentRepository = commentRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "comments.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Comment> comments = commentRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Comment comment : comments) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", comment.id().toString());
      data.put("parentType", comment.parentType().name());
      data.put("parentId", comment.parentId().toString());
      data.put("body", comment.body());
      data.put("format", comment.format().name());
      data.put("createdAt", comment.createdAt().toString());
      data.put("updatedAt", comment.updatedAt().toString());
      data.put("editedAt", comment.editedAt().map(Instant::toString).orElse(null));
      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize comments export data", e);
    }
  }
}

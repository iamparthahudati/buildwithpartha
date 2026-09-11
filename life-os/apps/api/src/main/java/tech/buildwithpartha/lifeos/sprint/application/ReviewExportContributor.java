package tech.buildwithpartha.lifeos.sprint.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewAnswer;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewItemDecision;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;

/**
 * Contributes daily/weekly review reflections and decisions to user data export archives
 * (LOS-1512).
 */
@Component
public class ReviewExportContributor implements UserDataExportContributor {

  private final ReviewRepository reviewRepository;
  private final ObjectMapper objectMapper;

  public ReviewExportContributor(ReviewRepository reviewRepository) {
    this.reviewRepository = reviewRepository;
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  @Override
  public String exportFileName() {
    return "reviews.json";
  }

  @Override
  public byte[] exportDataForUser(UUID userId) {
    List<Review> reviews = reviewRepository.findByUserId(userId);
    List<Map<String, Object>> records = new ArrayList<>();

    for (Review review : reviews) {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("id", review.id().toString());
      data.put("reviewType", review.reviewType().name());
      data.put("periodKey", review.periodKey());
      data.put("startDate", review.startDate().toString());
      data.put("endDate", review.endDate().toString());
      data.put("timeZone", review.timeZone());
      data.put("status", review.status().name());
      data.put("skipReason", review.skipReason().orElse(null));
      data.put("finalizedAt", review.finalizedAt().map(Instant::toString).orElse(null));
      data.put("createdAt", review.createdAt().toString());
      data.put("updatedAt", review.updatedAt().toString());

      List<Map<String, Object>> answers = new ArrayList<>();
      for (ReviewAnswer answer : review.answers()) {
        Map<String, Object> answerData = new LinkedHashMap<>();
        answerData.put("id", answer.id().toString());
        answerData.put("promptKey", answer.promptKey());
        answerData.put("answerValue", answer.answerValue());
        answers.add(answerData);
      }
      data.put("answers", answers);

      List<Map<String, Object>> decisions = new ArrayList<>();
      for (ReviewItemDecision decision : review.itemDecisions()) {
        Map<String, Object> decisionData = new LinkedHashMap<>();
        decisionData.put("id", decision.id().toString());
        decisionData.put("itemType", decision.itemType());
        decisionData.put("itemId", decision.itemId().toString());
        decisionData.put("action", decision.action());
        decisionData.put("targetDate", decision.targetDate().map(LocalDate::toString).orElse(null));
        decisionData.put("notes", decision.notes().orElse(null));
        decisions.add(decisionData);
      }
      data.put("itemDecisions", decisions);

      records.add(data);
    }

    try {
      return objectMapper.writeValueAsBytes(records);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to serialize reviews export data", e);
    }
  }
}

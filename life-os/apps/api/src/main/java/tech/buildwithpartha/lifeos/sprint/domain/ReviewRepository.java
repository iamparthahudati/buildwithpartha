package tech.buildwithpartha.lifeos.sprint.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository {
  Review save(Review review);

  Optional<Review> findById(UUID id);

  Optional<Review> findByUserIdAndTypeAndPeriodKey(
      UUID userId, ReviewType reviewType, String periodKey);

  List<Review> findByUserIdAndType(UUID userId, ReviewType reviewType);
}

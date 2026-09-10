package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReviewAnswerJpaRepository extends JpaRepository<ReviewAnswerEntity, UUID> {
  List<ReviewAnswerEntity> findByReviewId(UUID reviewId);

  List<ReviewAnswerEntity> findByReviewIdIn(Collection<UUID> reviewIds);

  void deleteByReviewId(UUID reviewId);
}

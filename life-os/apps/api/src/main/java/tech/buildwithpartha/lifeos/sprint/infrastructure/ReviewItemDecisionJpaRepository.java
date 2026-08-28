package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReviewItemDecisionJpaRepository extends JpaRepository<ReviewItemDecisionEntity, UUID> {
  List<ReviewItemDecisionEntity> findByReviewId(UUID reviewId);

  void deleteByReviewId(UUID reviewId);
}

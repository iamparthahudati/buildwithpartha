package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;

interface ReviewJpaRepository extends JpaRepository<ReviewEntity, UUID> {
  Optional<ReviewEntity> findByUserIdAndReviewTypeAndPeriodKey(
      UUID userId, ReviewType reviewType, String periodKey);

  List<ReviewEntity> findByUserIdAndReviewTypeOrderByStartDateDesc(
      UUID userId, ReviewType reviewType);
}

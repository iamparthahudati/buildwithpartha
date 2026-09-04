package tech.buildwithpartha.lifeos.common.idempotency.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data JPA repository for {@link IdempotencyRecordEntity}. */
public interface IdempotencyRecordJpaRepository
    extends JpaRepository<IdempotencyRecordEntity, UUID> {

  Optional<IdempotencyRecordEntity> findByUserIdAndIdempotencyKey(
      UUID userId, String idempotencyKey);

  @Modifying
  @Query("DELETE FROM IdempotencyRecordEntity e WHERE e.expiresAt < :now")
  int deleteExpiredBefore(@Param("now") Instant now);
}

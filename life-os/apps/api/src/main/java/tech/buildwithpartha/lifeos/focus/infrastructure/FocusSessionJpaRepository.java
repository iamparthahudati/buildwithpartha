package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface FocusSessionJpaRepository extends JpaRepository<FocusSessionEntity, UUID> {

  @Query(
      value = "SELECT u.id FROM public.users u WHERE u.id = :userId FOR UPDATE",
      nativeQuery = true)
  Object lockUserById(@Param("userId") UUID userId);

  Optional<FocusSessionEntity> findByIdAndUserId(UUID id, UUID userId);

  @Query(
      "SELECT f FROM FocusSessionEntity f WHERE f.userId = :userId"
          + " AND f.status IN"
          + " (tech.buildwithpartha.lifeos.focus.domain.FocusSessionStatus.RUNNING,"
          + " tech.buildwithpartha.lifeos.focus.domain.FocusSessionStatus.PAUSED)")
  Optional<FocusSessionEntity> findActiveByUserId(@Param("userId") UUID userId);

  List<FocusSessionEntity>
      findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAtAsc(
          UUID userId, Instant rangeStart, Instant rangeEnd);
}

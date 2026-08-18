package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SessionJpaRepository extends JpaRepository<SessionEntity, UUID> {

  Optional<SessionEntity> findByTokenHash(String tokenHash);

  @Modifying(clearAutomatically = true)
  @Query(
      "update SessionEntity s set s.revokedAt = :revokedAt "
          + "where s.id = :id and s.revokedAt is null")
  int revokeIfActive(@Param("id") UUID id, @Param("revokedAt") Instant revokedAt);

  @Modifying(clearAutomatically = true)
  @Query(
      "update SessionEntity s set s.revokedAt = :revokedAt "
          + "where s.userId = :userId and s.revokedAt is null")
  int revokeAllForUser(@Param("userId") UUID userId, @Param("revokedAt") Instant revokedAt);
}

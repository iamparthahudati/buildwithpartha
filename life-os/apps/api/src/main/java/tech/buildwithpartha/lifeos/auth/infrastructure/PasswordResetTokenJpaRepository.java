package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PasswordResetTokenJpaRepository extends JpaRepository<PasswordResetTokenEntity, UUID> {

  Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

  /**
   * The same single-use conditional-update guard {@code EmailVerificationTokenJpaRepository
   * #consumeIfUnconsumed} established, including {@code flushAutomatically = true} — see that
   * method's Javadoc for why {@code clearAutomatically} alone silently drops any other pending
   * change in the same transaction.
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "update PasswordResetTokenEntity t set t.consumedAt = :consumedAt "
          + "where t.id = :id and t.consumedAt is null")
  int consumeIfUnconsumed(@Param("id") UUID id, @Param("consumedAt") Instant consumedAt);
}

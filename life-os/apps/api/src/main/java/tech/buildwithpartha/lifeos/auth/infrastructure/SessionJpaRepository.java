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

  /**
   * The same single-use conditional-update guard {@code EmailVerificationTokenJpaRepository
   * #consumeIfUnconsumed} established, including {@code flushAutomatically = true} — see that
   * method's Javadoc for why {@code clearAutomatically} alone silently drops any other pending
   * change in the same transaction.
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "update SessionEntity s set s.revokedAt = :revokedAt "
          + "where s.id = :id and s.revokedAt is null")
  int revokeIfActive(@Param("id") UUID id, @Param("revokedAt") Instant revokedAt);

  /**
   * {@code flushAutomatically = true} matters here specifically: LOS-0507's {@code
   * ResetPasswordService} calls this immediately after rehashing the account's credential in the
   * same transaction, and without the flag that pending credential change was silently discarded
   * when this bulk update cleared the persistence context — caught by {@code PasswordResetWiringIT}
   * before it ever shipped.
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "update SessionEntity s set s.revokedAt = :revokedAt "
          + "where s.userId = :userId and s.revokedAt is null")
  int revokeAllForUser(@Param("userId") UUID userId, @Param("revokedAt") Instant revokedAt);
}

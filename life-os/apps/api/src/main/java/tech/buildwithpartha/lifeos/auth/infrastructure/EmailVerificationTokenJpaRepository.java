package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface EmailVerificationTokenJpaRepository
    extends JpaRepository<EmailVerificationTokenEntity, UUID> {

  Optional<EmailVerificationTokenEntity> findByTokenHash(String tokenHash);

  /**
   * The single-use guard: only an unconsumed row is updated, so two concurrent callers racing the
   * same token can never both return 1. {@code clearAutomatically = true} because a bulk update
   * bypasses the persistence context — without it, a managed {@code EmailVerificationTokenEntity}
   * already loaded in the same transaction (as {@code EmailVerificationService.verify} always has,
   * from its own {@code findByTokenHash} lookup) would keep reporting the pre-update, unconsumed
   * value if read again.
   */
  @Modifying(clearAutomatically = true)
  @Query(
      "update EmailVerificationTokenEntity t set t.consumedAt = :consumedAt "
          + "where t.id = :id and t.consumedAt is null")
  int consumeIfUnconsumed(@Param("id") UUID id, @Param("consumedAt") Instant consumedAt);
}

package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetTokenRepository;

@Component
class JpaPasswordResetTokenRepository implements PasswordResetTokenRepository {

  private final PasswordResetTokenJpaRepository jpaRepository;

  JpaPasswordResetTokenRepository(PasswordResetTokenJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public PasswordResetToken save(PasswordResetToken token) {
    return toDomain(jpaRepository.save(toEntity(token)));
  }

  @Override
  public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
    return jpaRepository.findByTokenHash(tokenHash).map(JpaPasswordResetTokenRepository::toDomain);
  }

  @Override
  public boolean consume(UUID tokenId, Instant consumedAt) {
    return jpaRepository.consumeIfUnconsumed(tokenId, consumedAt) == 1;
  }

  private static PasswordResetTokenEntity toEntity(PasswordResetToken token) {
    return new PasswordResetTokenEntity(
        token.id(),
        token.userId(),
        token.tokenHash(),
        token.expiresAt(),
        token.consumedAt().orElse(null),
        token.createdAt());
  }

  private static PasswordResetToken toDomain(PasswordResetTokenEntity entity) {
    return new PasswordResetToken(
        entity.getId(),
        entity.getUserId(),
        entity.getTokenHash(),
        entity.getExpiresAt(),
        Optional.ofNullable(entity.getConsumedAt()),
        entity.getCreatedAt());
  }
}

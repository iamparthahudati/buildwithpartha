package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;

@Component
class JpaEmailVerificationTokenRepository implements EmailVerificationTokenRepository {

  private final EmailVerificationTokenJpaRepository jpaRepository;

  JpaEmailVerificationTokenRepository(EmailVerificationTokenJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public EmailVerificationToken save(EmailVerificationToken token) {
    return toDomain(jpaRepository.save(toEntity(token)));
  }

  @Override
  public Optional<EmailVerificationToken> findByTokenHash(String tokenHash) {
    return jpaRepository
        .findByTokenHash(tokenHash)
        .map(JpaEmailVerificationTokenRepository::toDomain);
  }

  @Override
  public boolean consume(UUID tokenId, Instant consumedAt) {
    return jpaRepository.consumeIfUnconsumed(tokenId, consumedAt) == 1;
  }

  private static EmailVerificationTokenEntity toEntity(EmailVerificationToken token) {
    return new EmailVerificationTokenEntity(
        token.id(),
        token.userId(),
        token.tokenHash(),
        token.expiresAt(),
        token.consumedAt().orElse(null),
        token.createdAt());
  }

  private static EmailVerificationToken toDomain(EmailVerificationTokenEntity entity) {
    return new EmailVerificationToken(
        entity.getId(),
        entity.getUserId(),
        entity.getTokenHash(),
        entity.getExpiresAt(),
        Optional.ofNullable(entity.getConsumedAt()),
        entity.getCreatedAt());
  }
}

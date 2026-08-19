package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;

@Component
class JpaTermsAcceptanceRepository implements TermsAcceptanceRepository {

  private final TermsAcceptanceJpaRepository jpaRepository;

  JpaTermsAcceptanceRepository(TermsAcceptanceJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public TermsAcceptance save(TermsAcceptance acceptance) {
    return toDomain(jpaRepository.save(toEntity(acceptance)));
  }

  @Override
  public List<TermsAcceptance> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).stream()
        .map(JpaTermsAcceptanceRepository::toDomain)
        .toList();
  }

  private static TermsAcceptanceEntity toEntity(TermsAcceptance acceptance) {
    return new TermsAcceptanceEntity(
        acceptance.id(),
        acceptance.userId(),
        acceptance.termsVersion(),
        acceptance.acceptedAt(),
        acceptance.ipSource().orElse(null),
        acceptance.createdAt());
  }

  private static TermsAcceptance toDomain(TermsAcceptanceEntity entity) {
    return new TermsAcceptance(
        entity.getId(),
        entity.getUserId(),
        entity.getTermsVersion(),
        entity.getAcceptedAt(),
        Optional.ofNullable(entity.getIpSource()),
        entity.getCreatedAt());
  }
}

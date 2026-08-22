package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;

@Component
class JpaCredentialRepository implements CredentialRepository {

  private final CredentialJpaRepository jpaRepository;

  JpaCredentialRepository(CredentialJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Credential save(Credential credential) {
    return toDomain(jpaRepository.save(toEntity(credential)));
  }

  @Override
  public Optional<Credential> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).map(JpaCredentialRepository::toDomain);
  }

  private static CredentialEntity toEntity(Credential credential) {
    return new CredentialEntity(
        credential.id(),
        credential.userId(),
        credential.passwordHash(),
        credential.changedAt(),
        credential.createdAt(),
        credential.updatedAt());
  }

  private static Credential toDomain(CredentialEntity entity) {
    return new Credential(
        entity.getId(),
        entity.getUserId(),
        entity.getPasswordHash(),
        entity.getChangedAt(),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }
}

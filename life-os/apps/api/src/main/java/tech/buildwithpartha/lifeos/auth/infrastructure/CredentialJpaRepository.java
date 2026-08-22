package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface CredentialJpaRepository extends JpaRepository<CredentialEntity, UUID> {

  Optional<CredentialEntity> findByUserId(UUID userId);
}

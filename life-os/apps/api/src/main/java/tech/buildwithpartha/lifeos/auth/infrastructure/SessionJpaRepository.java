package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SessionJpaRepository extends JpaRepository<SessionEntity, UUID> {

  Optional<SessionEntity> findByTokenHash(String tokenHash);
}

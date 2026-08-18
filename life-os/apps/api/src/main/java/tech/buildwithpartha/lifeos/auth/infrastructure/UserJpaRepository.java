package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {

  boolean existsByEmailNormalized(String emailNormalized);

  Optional<UserEntity> findByEmailNormalized(String emailNormalized);
}

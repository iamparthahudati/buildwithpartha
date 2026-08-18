package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {

  boolean existsByEmailNormalized(String emailNormalized);
}

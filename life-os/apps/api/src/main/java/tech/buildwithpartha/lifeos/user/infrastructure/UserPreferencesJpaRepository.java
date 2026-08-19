package tech.buildwithpartha.lifeos.user.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserPreferencesJpaRepository extends JpaRepository<UserPreferencesEntity, UUID> {

  Optional<UserPreferencesEntity> findByUserId(UUID userId);

  void deleteByUserId(UUID userId);
}

package tech.buildwithpartha.lifeos.user.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserProfileJpaRepository extends JpaRepository<UserProfileEntity, UUID> {}

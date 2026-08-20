package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ProjectJpaRepository extends JpaRepository<ProjectEntity, UUID> {
  List<ProjectEntity> findByUserId(UUID userId);
}

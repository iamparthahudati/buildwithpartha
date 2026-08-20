package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface MilestoneJpaRepository extends JpaRepository<MilestoneEntity, UUID> {
  List<MilestoneEntity> findByProjectId(UUID projectId);
}

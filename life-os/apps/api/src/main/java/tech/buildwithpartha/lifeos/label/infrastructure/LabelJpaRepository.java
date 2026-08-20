package tech.buildwithpartha.lifeos.label.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface LabelJpaRepository extends JpaRepository<LabelEntity, UUID> {
  List<LabelEntity> findByUserId(UUID userId);
}

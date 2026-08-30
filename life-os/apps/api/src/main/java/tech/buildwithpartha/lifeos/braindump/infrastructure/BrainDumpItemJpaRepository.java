package tech.buildwithpartha.lifeos.braindump.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface BrainDumpItemJpaRepository extends JpaRepository<BrainDumpItemEntity, UUID> {

  Optional<BrainDumpItemEntity> findByIdAndUserId(UUID id, UUID userId);

  @Query(
      "SELECT COUNT(b) FROM BrainDumpItemEntity b "
          + "WHERE b.userId = :userId "
          + "AND b.status = 'UNPROCESSED' "
          + "AND b.archivedAt IS NULL")
  int countUnprocessedByUserId(@Param("userId") UUID userId);
}

package tech.buildwithpartha.lifeos.export.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ExportFileJpaRepository extends JpaRepository<ExportFileEntity, UUID> {

  String GENERATING = "tech.buildwithpartha.lifeos.export.domain.ExportFileStatus.GENERATING";
  String READY = "tech.buildwithpartha.lifeos.export.domain.ExportFileStatus.READY";
  String EXPIRED = "tech.buildwithpartha.lifeos.export.domain.ExportFileStatus.EXPIRED";
  String DELETED = "tech.buildwithpartha.lifeos.export.domain.ExportFileStatus.DELETED";

  Optional<ExportFileEntity> findByDownloadTokenHash(String downloadTokenHash);

  @Query("SELECT e FROM ExportFileEntity e WHERE e.userId = :userId " + "ORDER BY e.createdAt DESC")
  List<ExportFileEntity> findByUserId(@Param("userId") UUID userId);

  @Query(
      "SELECT count(e) FROM ExportFileEntity e WHERE e.userId = :userId AND e.status IN ("
          + GENERATING
          + ", "
          + READY
          + ")")
  long countActiveByUserId(@Param("userId") UUID userId);

  @Query("SELECT e FROM ExportFileEntity e WHERE e.status = " + READY + " AND e.expiresAt <= :now")
  List<ExportFileEntity> findOverdueReady(@Param("now") Instant now);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "DELETE FROM ExportFileEntity e WHERE e.status IN ("
          + EXPIRED
          + ", "
          + DELETED
          + ") AND e.updatedAt < :cutoff")
  int deleteTerminalOlderThan(@Param("cutoff") Instant cutoff);
}

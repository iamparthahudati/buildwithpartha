package tech.buildwithpartha.lifeos.task.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface TaskJpaRepository extends JpaRepository<TaskEntity, UUID> {

  Optional<TaskEntity> findByIdAndUserId(UUID id, UUID userId);

  List<TaskEntity> findByUserId(UUID userId);

  List<TaskEntity> findByProjectId(UUID projectId);

  List<TaskEntity> findByUserIdAndMitDate(UUID userId, LocalDate mitDate);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "UPDATE TaskEntity t SET t.mitDate = NULL WHERE t.userId = :userId AND t.mitDate = :mitDate")
  void clearMitDateForUserAndDate(
      @Param("userId") UUID userId, @Param("mitDate") LocalDate mitDate);
}

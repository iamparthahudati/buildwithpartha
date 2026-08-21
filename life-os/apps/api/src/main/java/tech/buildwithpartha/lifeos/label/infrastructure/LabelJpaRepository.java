package tech.buildwithpartha.lifeos.label.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface LabelJpaRepository extends JpaRepository<LabelEntity, UUID> {
  List<LabelEntity> findByUserId(UUID userId);

  Optional<LabelEntity> findByUserIdAndNameNormalized(UUID userId, String nameNormalized);

  @Modifying
  @Query(
      nativeQuery = true,
      value =
          "DELETE FROM public.project_labels WHERE label_id = :labelId AND project_id IN (SELECT"
              + " pl.project_id FROM public.project_labels pl WHERE pl.label_id ="
              + " :replacementLabelId)")
  void deleteDuplicateProjectLabels(
      @Param("labelId") UUID labelId, @Param("replacementLabelId") UUID replacementLabelId);

  @Modifying
  @Query(
      nativeQuery = true,
      value =
          "UPDATE public.project_labels SET label_id = :replacementLabelId WHERE label_id ="
              + " :labelId AND project_id IN (SELECT id FROM public.projects WHERE user_id ="
              + " :userId)")
  void reassignProjectLabels(
      @Param("userId") UUID userId,
      @Param("labelId") UUID labelId,
      @Param("replacementLabelId") UUID replacementLabelId);

  @Modifying
  @Query(
      nativeQuery = true,
      value =
          "DELETE FROM public.task_labels WHERE label_id = :labelId AND task_id IN (SELECT"
              + " tl.task_id FROM public.task_labels tl WHERE tl.label_id = :replacementLabelId)")
  void deleteDuplicateTaskLabels(
      @Param("labelId") UUID labelId, @Param("replacementLabelId") UUID replacementLabelId);

  @Modifying
  @Query(
      nativeQuery = true,
      value =
          "UPDATE public.task_labels SET label_id = :replacementLabelId WHERE label_id = :labelId"
              + " AND task_id IN (SELECT id FROM public.tasks WHERE user_id = :userId)")
  void reassignTaskLabels(
      @Param("userId") UUID userId,
      @Param("labelId") UUID labelId,
      @Param("replacementLabelId") UUID replacementLabelId);
}

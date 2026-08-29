package tech.buildwithpartha.lifeos.comment.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface CommentJpaRepository extends JpaRepository<CommentEntity, UUID> {

  Optional<CommentEntity> findByIdAndUserIdAndTaskId(UUID id, UUID userId, UUID taskId);

  Optional<CommentEntity> findByIdAndUserIdAndProjectId(UUID id, UUID userId, UUID projectId);

  Page<CommentEntity> findByUserIdAndTaskIdOrderByCreatedAtDescIdDesc(
      UUID userId, UUID taskId, Pageable pageable);

  Page<CommentEntity> findByUserIdAndProjectIdOrderByCreatedAtDescIdDesc(
      UUID userId, UUID projectId, Pageable pageable);

  long countByUserIdAndTaskId(UUID userId, UUID taskId);

  long countByUserIdAndProjectId(UUID userId, UUID projectId);
}

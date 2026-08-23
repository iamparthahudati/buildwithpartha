package tech.buildwithpartha.lifeos.comment.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentRepository;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;

@Component
class JpaCommentRepository implements CommentRepository {

  private final CommentJpaRepository jpa;

  JpaCommentRepository(CommentJpaRepository jpa) {
    this.jpa = jpa;
  }

  @Override
  public Comment save(Comment comment) {
    return toDomain(jpa.saveAndFlush(toEntity(comment)));
  }

  @Override
  public Optional<Comment> findOwned(
      UUID id, UUID userId, CommentParentType parentType, UUID parentId) {
    Optional<CommentEntity> entity =
        switch (parentType) {
          case TASK -> jpa.findByIdAndUserIdAndTaskId(id, userId, parentId);
          case PROJECT -> jpa.findByIdAndUserIdAndProjectId(id, userId, parentId);
        };
    return entity.map(JpaCommentRepository::toDomain);
  }

  @Override
  public List<Comment> findPage(
      UUID userId, CommentParentType parentType, UUID parentId, int page, int size) {
    PageRequest pageable = PageRequest.of(page, size);
    Page<CommentEntity> result =
        switch (parentType) {
          case TASK ->
              jpa.findByUserIdAndTaskIdOrderByCreatedAtDescIdDesc(userId, parentId, pageable);
          case PROJECT ->
              jpa.findByUserIdAndProjectIdOrderByCreatedAtDescIdDesc(userId, parentId, pageable);
        };
    return result.map(JpaCommentRepository::toDomain).getContent();
  }

  @Override
  public long count(UUID userId, CommentParentType parentType, UUID parentId) {
    return switch (parentType) {
      case TASK -> jpa.countByUserIdAndTaskId(userId, parentId);
      case PROJECT -> jpa.countByUserIdAndProjectId(userId, parentId);
    };
  }

  @Override
  public void delete(Comment comment) {
    jpa.delete(toEntity(comment));
    jpa.flush();
  }

  private static CommentEntity toEntity(Comment comment) {
    UUID taskId = comment.parentType() == CommentParentType.TASK ? comment.parentId() : null;
    UUID projectId = comment.parentType() == CommentParentType.PROJECT ? comment.parentId() : null;
    return new CommentEntity(
        comment.id(),
        comment.userId(),
        taskId,
        projectId,
        comment.body(),
        comment.format(),
        comment.createdAt(),
        comment.updatedAt(),
        comment.editedAt().orElse(null),
        comment.version());
  }

  private static Comment toDomain(CommentEntity entity) {
    CommentParentType parentType =
        entity.getTaskId() == null ? CommentParentType.PROJECT : CommentParentType.TASK;
    UUID parentId =
        parentType == CommentParentType.TASK ? entity.getTaskId() : entity.getProjectId();
    return new Comment(
        entity.getId(),
        entity.getUserId(),
        parentType,
        parentId,
        entity.getBody(),
        entity.getFormat(),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        Optional.ofNullable(entity.getEditedAt()),
        entity.getVersion());
  }
}

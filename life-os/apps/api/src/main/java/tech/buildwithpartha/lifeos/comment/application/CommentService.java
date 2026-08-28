package tech.buildwithpartha.lifeos.comment.application;

import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentBodyPolicy;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;
import tech.buildwithpartha.lifeos.comment.domain.CommentRepository;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.comment.CommentCountPort;
import tech.buildwithpartha.lifeos.common.comment.CommentParentAccess;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** User-scoped Task/Project Comment lifecycle service. */
@Service
public class CommentService implements CommentCountPort {

  public static final int MAX_PAGE_SIZE = 100;

  private final CommentRepository repository;
  private final ProductActivityPort activityPort;
  private final CommentBodyPolicy bodyPolicy;
  private final Clock clock;
  private final Map<CommentParentType, CommentParentAccess> parentAccess;

  public CommentService(
      CommentRepository repository,
      ProductActivityPort activityPort,
      List<CommentParentAccess> parentAccess,
      Clock clock) {
    this.repository = repository;
    this.activityPort = activityPort;
    this.bodyPolicy = new CommentBodyPolicy();
    this.clock = clock;
    EnumMap<CommentParentType, CommentParentAccess> accessByType =
        new EnumMap<>(CommentParentType.class);
    parentAccess.forEach(
        access -> {
          if (accessByType.put(access.parentType(), access) != null) {
            throw new IllegalStateException("Duplicate Comment parent access adapter");
          }
        });
    this.parentAccess = Map.copyOf(accessByType);
  }

  @Transactional
  public Comment create(
      UUID userId, CommentParentType parentType, UUID parentId, String body, CommentFormat format) {
    access(parentType).requireWritable(userId, parentId);
    String sanitized = sanitize(body, format);
    Comment saved =
        repository.save(
            Comment.create(
                UUID.randomUUID(),
                userId,
                parentType,
                parentId,
                sanitized,
                format,
                clock.instant()));
    recordActivity(saved, ActivityEventType.COMMENT_CREATED);
    return saved;
  }

  @Transactional(readOnly = true)
  public Comment get(UUID userId, CommentParentType parentType, UUID parentId, UUID commentId) {
    access(parentType).requireReadable(userId, parentId);
    return ownedComment(userId, parentType, parentId, commentId);
  }

  @Transactional(readOnly = true)
  public PageResponse<Comment> list(
      UUID userId, CommentParentType parentType, UUID parentId, int page, int size) {
    validatePage(page, size);
    access(parentType).requireReadable(userId, parentId);
    List<Comment> items = repository.findPage(userId, parentType, parentId, page, size);
    long total = repository.count(userId, parentType, parentId);
    return PageResponse.of(items, page, size, total);
  }

  @Transactional
  public Comment update(
      UUID userId,
      CommentParentType parentType,
      UUID parentId,
      UUID commentId,
      String body,
      CommentFormat format,
      long version) {
    access(parentType).requireWritable(userId, parentId);
    Comment existing = ownedComment(userId, parentType, parentId, commentId);
    requireVersion(existing, version);
    String sanitized = sanitize(body, format);
    Comment saved = repository.save(existing.edit(sanitized, format, clock.instant()));
    recordActivity(saved, ActivityEventType.COMMENT_UPDATED);
    return saved;
  }

  @Transactional
  public void delete(
      UUID userId, CommentParentType parentType, UUID parentId, UUID commentId, long version) {
    access(parentType).requireReadable(userId, parentId);
    Comment existing = ownedComment(userId, parentType, parentId, commentId);
    requireVersion(existing, version);
    repository.delete(existing);
    recordActivity(existing, ActivityEventType.COMMENT_DELETED);
  }

  @Override
  @Transactional(readOnly = true)
  public long count(UUID userId, CommentParentType parentType, UUID parentId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(parentType, "parentType must not be null");
    Objects.requireNonNull(parentId, "parentId must not be null");
    return repository.count(userId, parentType, parentId);
  }

  private Comment ownedComment(
      UUID userId, CommentParentType parentType, UUID parentId, UUID commentId) {
    return repository
        .findOwned(commentId, userId, parentType, parentId)
        .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
  }

  private String sanitize(String body, CommentFormat format) {
    try {
      return bodyPolicy.sanitize(body, format);
    } catch (IllegalArgumentException exception) {
      throw new FieldValidationException(
          "Invalid Comment body", List.of(new FieldProblem("body", "UNSAFE_OR_INVALID")));
    }
  }

  private CommentParentAccess access(CommentParentType parentType) {
    Objects.requireNonNull(parentType, "parentType must not be null");
    CommentParentAccess access = parentAccess.get(parentType);
    if (access == null) {
      throw new IllegalStateException("No Comment parent access adapter for " + parentType);
    }
    return access;
  }

  private void recordActivity(Comment comment, ActivityEventType eventType) {
    activityPort.record(
        new ProductActivityCommand(
            comment.userId(),
            comment.userId(),
            eventType,
            ActivitySubjectType.valueOf(comment.parentType().name()),
            comment.parentId()));
  }

  private static void requireVersion(Comment comment, long version) {
    if (version < 0 || comment.version() != version) {
      throw new ConcurrencyConflictException("Comment was modified by another request");
    }
  }

  private static void validatePage(int page, int size) {
    if (page < 0) {
      throw new FieldValidationException("Invalid page", List.of(new FieldProblem("page", "MIN")));
    }
    if (size < 1 || size > MAX_PAGE_SIZE) {
      throw new FieldValidationException(
          "Invalid size", List.of(new FieldProblem("size", "RANGE")));
    }
  }
}

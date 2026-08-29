package tech.buildwithpartha.lifeos.note.infrastructure;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.note.domain.Note;

/** JPA entity mapping to {@code public.notes}. */
@Entity
@Table(name = "notes", schema = "public")
class NoteEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "body", nullable = false)
  private String body;

  @Column(name = "pinned", nullable = false)
  private boolean pinned;

  @Column(name = "archived", nullable = false)
  private boolean archived;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
      name = "note_labels",
      schema = "public",
      joinColumns = @JoinColumn(name = "note_id"))
  @Column(name = "label_id")
  private Set<UUID> labelIds = new HashSet<>();

  @OneToMany(
      cascade = jakarta.persistence.CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.EAGER)
  @JoinColumn(name = "note_id")
  private List<NoteLinkEntity> links = new ArrayList<>();

  protected NoteEntity() {}

  NoteEntity(
      UUID id,
      UUID userId,
      String title,
      String body,
      boolean pinned,
      boolean archived,
      Instant createdAt,
      Instant updatedAt,
      Set<UUID> labelIds,
      List<NoteLinkEntity> links,
      long version) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.body = body;
    this.pinned = pinned;
    this.archived = archived;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.labelIds = labelIds != null ? labelIds : new HashSet<>();
    this.links = links != null ? links : new ArrayList<>();
    this.version = version;
  }

  static NoteEntity fromDomain(Note domain) {
    List<NoteLinkEntity> linkEntities =
        domain.links().stream().map(NoteLinkEntity::fromDomain).toList();
    return new NoteEntity(
        domain.id(),
        domain.userId(),
        domain.title(),
        domain.body(),
        domain.pinned(),
        domain.archived(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.labelIds(),
        linkEntities,
        domain.version());
  }

  Note toDomain() {
    return new Note(
        id,
        userId,
        title,
        body,
        pinned,
        archived,
        createdAt,
        updatedAt,
        labelIds,
        links.stream().map(NoteLinkEntity::toDomain).toList(),
        version);
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getTitle() {
    return title;
  }

  public String getBody() {
    return body;
  }

  public boolean isPinned() {
    return pinned;
  }

  public boolean isArchived() {
    return archived;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public Set<UUID> getLabelIds() {
    return labelIds;
  }

  public List<NoteLinkEntity> getLinks() {
    return links;
  }

  public long getVersion() {
    return version;
  }
}

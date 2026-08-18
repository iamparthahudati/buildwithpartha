package tech.buildwithpartha.lifeos.notification.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus;

/**
 * JPA row for {@code public.outbox_messages} ({@code V3__outbox_schema.sql}). The id is
 * application-assigned (see {@code MailOutboxService.enqueue}); the column default is a safety net,
 * not the primary path. Translated to and from the immutable {@code
 * notification.domain.OutboxMessage} aggregate by {@link JpaOutboxRepository}.
 */
@Entity
@Table(name = "outbox_messages", schema = "public")
class OutboxMessageEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id")
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "message_kind", nullable = false, updatable = false)
  private MailMessageKind messageKind;

  @Column(name = "recipient_email", nullable = false, updatable = false)
  private String recipientEmail;

  @Convert(converter = TemplateVariablesConverter.class)
  @Column(name = "template_variables", nullable = false, columnDefinition = "TEXT")
  private Map<String, String> templateVariables;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private OutboxMessageStatus status;

  @Column(name = "attempt_count", nullable = false)
  private int attemptCount;

  @Column(name = "next_attempt_at", nullable = false)
  private Instant nextAttemptAt;

  @Column(name = "last_attempt_at")
  private Instant lastAttemptAt;

  @Column(name = "last_error_class")
  private String lastErrorClass;

  @Column(name = "provider_message_id")
  private String providerMessageId;

  @Column(name = "sent_at")
  private Instant sentAt;

  @Column(name = "dead_lettered_at")
  private Instant deadLetteredAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected OutboxMessageEntity() {}

  OutboxMessageEntity(
      UUID id,
      UUID userId,
      MailMessageKind messageKind,
      String recipientEmail,
      Map<String, String> templateVariables,
      OutboxMessageStatus status,
      int attemptCount,
      Instant nextAttemptAt,
      Instant lastAttemptAt,
      String lastErrorClass,
      String providerMessageId,
      Instant sentAt,
      Instant deadLetteredAt,
      Instant createdAt,
      Instant updatedAt) {
    this.id = id;
    this.userId = userId;
    this.messageKind = messageKind;
    this.recipientEmail = recipientEmail;
    this.templateVariables = templateVariables;
    this.status = status;
    this.attemptCount = attemptCount;
    this.nextAttemptAt = nextAttemptAt;
    this.lastAttemptAt = lastAttemptAt;
    this.lastErrorClass = lastErrorClass;
    this.providerMessageId = providerMessageId;
    this.sentAt = sentAt;
    this.deadLetteredAt = deadLetteredAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  MailMessageKind getMessageKind() {
    return messageKind;
  }

  String getRecipientEmail() {
    return recipientEmail;
  }

  Map<String, String> getTemplateVariables() {
    return templateVariables;
  }

  OutboxMessageStatus getStatus() {
    return status;
  }

  int getAttemptCount() {
    return attemptCount;
  }

  Instant getNextAttemptAt() {
    return nextAttemptAt;
  }

  Instant getLastAttemptAt() {
    return lastAttemptAt;
  }

  String getLastErrorClass() {
    return lastErrorClass;
  }

  String getProviderMessageId() {
    return providerMessageId;
  }

  Instant getSentAt() {
    return sentAt;
  }

  Instant getDeadLetteredAt() {
    return deadLetteredAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }
}

package tech.buildwithpartha.lifeos.common.mail;

/** The stable, shared vocabulary of mail messages the transactional outbox can send. */
public enum MailMessageKind {
  EMAIL_VERIFICATION,
  PASSWORD_RESET,
  SECURITY_ALERT
}

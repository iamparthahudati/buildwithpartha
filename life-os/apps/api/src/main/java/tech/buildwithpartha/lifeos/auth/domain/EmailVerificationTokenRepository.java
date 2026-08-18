package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A port over {@code public.email_verification_tokens}, implemented in {@code auth.infrastructure}
 * with JPA.
 */
public interface EmailVerificationTokenRepository {

  EmailVerificationToken save(EmailVerificationToken token);
}

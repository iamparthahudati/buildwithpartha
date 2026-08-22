package tech.buildwithpartha.lifeos.auth.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code public.terms_acceptances} row: one record per accepted document version.
 *
 * <p>{@code 31-PRIVACY-DATA-LIFECYCLE.md} requires terms acceptance and privacy notice
 * acknowledgment to stay separate records rather than one bundled checkbox/version. The table has a
 * single opaque {@code terms_version} text column, so each kind is its own row identified by a
 * {@link #TERMS_PREFIX}/{@link #PRIVACY_PREFIX}-prefixed version string; {@code
 * auth.application.SignupService} writes one row of each per signup.
 */
public record TermsAcceptance(
    UUID id,
    UUID userId,
    String termsVersion,
    Instant acceptedAt,
    Optional<String> ipSource,
    Instant createdAt) {

  public static final String TERMS_PREFIX = "terms:";
  public static final String PRIVACY_PREFIX = "privacy:";

  public TermsAcceptance {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(termsVersion, "termsVersion must not be null");
    Objects.requireNonNull(acceptedAt, "acceptedAt must not be null");
    Objects.requireNonNull(ipSource, "ipSource must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    if (termsVersion.isBlank()) {
      throw new IllegalArgumentException("termsVersion must not be blank");
    }
  }

  public static TermsAcceptance termsAccepted(
      UUID id, UUID userId, String version, Instant now, Optional<String> ipSource) {
    return new TermsAcceptance(id, userId, TERMS_PREFIX + version, now, ipSource, now);
  }

  public static TermsAcceptance privacyAcknowledged(
      UUID id, UUID userId, String version, Instant now, Optional<String> ipSource) {
    return new TermsAcceptance(id, userId, PRIVACY_PREFIX + version, now, ipSource, now);
  }
}

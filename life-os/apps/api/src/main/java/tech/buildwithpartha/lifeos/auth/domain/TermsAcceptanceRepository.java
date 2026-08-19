package tech.buildwithpartha.lifeos.auth.domain;

import java.util.List;
import java.util.UUID;

/**
 * A port over {@code public.terms_acceptances}, implemented in {@code auth.infrastructure} with
 * JPA.
 */
public interface TermsAcceptanceRepository {

  TermsAcceptance save(TermsAcceptance acceptance);

  List<TermsAcceptance> findByUserId(UUID userId);
}

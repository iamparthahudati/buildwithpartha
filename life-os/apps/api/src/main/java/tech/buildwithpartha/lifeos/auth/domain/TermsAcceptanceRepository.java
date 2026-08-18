package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A port over {@code public.terms_acceptances}, implemented in {@code auth.infrastructure} with
 * JPA.
 */
public interface TermsAcceptanceRepository {

  TermsAcceptance save(TermsAcceptance acceptance);
}

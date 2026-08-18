package tech.buildwithpartha.lifeos.auth.domain;

/** A port over {@code public.credentials}, implemented in {@code auth.infrastructure} with JPA. */
public interface CredentialRepository {

  Credential save(Credential credential);
}

package tech.buildwithpartha.lifeos.auth.domain;

import java.util.Optional;
import java.util.UUID;

/** A port over {@code public.credentials}, implemented in {@code auth.infrastructure} with JPA. */
public interface CredentialRepository {

  Credential save(Credential credential);

  Optional<Credential> findByUserId(UUID userId);
}

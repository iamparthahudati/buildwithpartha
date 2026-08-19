package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface TermsAcceptanceJpaRepository extends JpaRepository<TermsAcceptanceEntity, UUID> {

  List<TermsAcceptanceEntity> findByUserId(UUID userId);
}

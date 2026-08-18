package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface TermsAcceptanceJpaRepository extends JpaRepository<TermsAcceptanceEntity, UUID> {}

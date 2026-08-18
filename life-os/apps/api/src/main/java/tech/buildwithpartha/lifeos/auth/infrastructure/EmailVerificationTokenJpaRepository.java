package tech.buildwithpartha.lifeos.auth.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface EmailVerificationTokenJpaRepository
    extends JpaRepository<EmailVerificationTokenEntity, UUID> {}

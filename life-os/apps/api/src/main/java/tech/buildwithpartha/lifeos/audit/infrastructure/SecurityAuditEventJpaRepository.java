package tech.buildwithpartha.lifeos.audit.infrastructure;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SecurityAuditEventJpaRepository extends JpaRepository<SecurityAuditEventEntity, UUID> {

  @Modifying
  @Query("delete from SecurityAuditEventEntity event where event.expiresAt <= :cutoff")
  int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}

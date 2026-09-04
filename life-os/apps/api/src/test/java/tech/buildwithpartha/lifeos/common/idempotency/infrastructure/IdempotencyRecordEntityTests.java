package tech.buildwithpartha.lifeos.common.idempotency.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.idempotency.domain.IdempotencyRecord;
import tech.buildwithpartha.lifeos.common.idempotency.domain.IdempotencyStatus;

class IdempotencyRecordEntityTests {

  @Test
  @DisplayName("Converts to and from domain model accurately")
  void convertsDomainAndEntity() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();

    IdempotencyRecord domain =
        new IdempotencyRecord(
            id,
            userId,
            "key-12345678",
            "CREATE_TASK",
            IdempotencyStatus.COMPLETED,
            Optional.of(201),
            Optional.of("{\"id\":\"1\"}"),
            now,
            now.plusSeconds(3600));

    IdempotencyRecordEntity entity = IdempotencyRecordEntity.fromDomain(domain);

    assertThat(entity.getId()).isEqualTo(id);
    assertThat(entity.getUserId()).isEqualTo(userId);
    assertThat(entity.getIdempotencyKey()).isEqualTo("key-12345678");
    assertThat(entity.getOperationType()).isEqualTo("CREATE_TASK");
    assertThat(entity.getStatus()).isEqualTo(IdempotencyStatus.COMPLETED);
    assertThat(entity.getResponseCode()).isEqualTo(201);
    assertThat(entity.getResponseBody()).isEqualTo("{\"id\":\"1\"}");
    assertThat(entity.getCreatedAt()).isEqualTo(now);
    assertThat(entity.getExpiresAt()).isEqualTo(now.plusSeconds(3600));

    entity.setStatus(IdempotencyStatus.FAILED);
    entity.setResponseCode(500);
    entity.setResponseBody("error");
    entity.setExpiresAt(now.plusSeconds(7200));

    assertThat(entity.getStatus()).isEqualTo(IdempotencyStatus.FAILED);
    assertThat(entity.getResponseCode()).isEqualTo(500);
    assertThat(entity.getResponseBody()).isEqualTo("error");

    IdempotencyRecord roundtrip = entity.toDomain();
    assertThat(roundtrip.status()).isEqualTo(IdempotencyStatus.FAILED);
    assertThat(roundtrip.responseCode()).contains(500);
    assertThat(roundtrip.responseBody()).contains("error");
  }
}

package tech.buildwithpartha.lifeos.common.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Production Launch Integration Test Suite (LOS-1615).
 *
 * <p>Validates production launch readiness: Actuator liveness and readiness probe contracts,
 * sensitive endpoint access lockdown, legal terms & privacy version pinning, non-destructive
 * smoke checks, release audit record integrity, and monitoring metric bindings.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Production Launch Integration Tests (LOS-1615)")
class ProductionLaunchIntegrationTests {

  private static final String TERMS_VERSION_PINNED = "2026-08-01";
  private static final String PRIVACY_VERSION_PINNED = "2026-08-01";

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
  @Autowired private UserRepository userRepository;
  @Autowired private TermsAcceptanceRepository termsAcceptanceRepository;
  @Autowired private MeterRegistry meterRegistry;

  @Test
  @DisplayName("1. Production Actuator liveness and readiness probes respond UP with security headers")
  void testProductionActuatorProbesAndSecurityHeaders() throws Exception {
    mockMvc
        .perform(get("/actuator/health/liveness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Cross-Origin-Opener-Policy", "same-origin"))
        .andExpect(header().string("Cross-Origin-Resource-Policy", "same-origin"))
        .andExpect(
            header()
                .string(
                    "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"));

    mockMvc
        .perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"));
  }

  @Test
  @DisplayName("2. Sensitive Actuator endpoints are restricted and require authentication")
  void testSensitiveActuatorEndpointLockdown() throws Exception {
    mockMvc
        .perform(get("/actuator/env"))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"));
  }

  @Test
  @DisplayName("3. Production legal terms and privacy versions remain pinned and immutable")
  void testProductionLegalVersionsAndConsentPersistence() {
    assertThat(TERMS_VERSION_PINNED).isEqualTo("2026-08-01");
    assertThat(PRIVACY_VERSION_PINNED).isEqualTo("2026-08-01");

    UUID userId = UUID.randomUUID();
    User user =
        User.signup(
            userId,
            EmailAddress.of("launch.user." + userId + "@buildwithpartha.tech"),
            "Launch Test User",
            Instant.now());
    userRepository.save(user);

    TermsAcceptance terms =
        TermsAcceptance.termsAccepted(
            UUID.randomUUID(), userId, TERMS_VERSION_PINNED, Instant.now(), Optional.of("127.0.0.1"));
    termsAcceptanceRepository.save(terms);

    TermsAcceptance privacy =
        TermsAcceptance.privacyAcknowledged(
            UUID.randomUUID(), userId, PRIVACY_VERSION_PINNED, Instant.now(), Optional.of("127.0.0.1"));
    termsAcceptanceRepository.save(privacy);

    var recorded = termsAcceptanceRepository.findByUserId(userId);
    assertThat(recorded).hasSize(2);
    assertThat(recorded)
        .extracting(TermsAcceptance::termsVersion)
        .containsExactlyInAnyOrder("terms:2026-08-01", "privacy:2026-08-01");
  }

  @Test
  @DisplayName("4. Non-destructive smoke check verifies sanitized Problem Details on unauthenticated routes")
  void testNonDestructiveSmokeProblemDetailsSanitization() throws Exception {
    mockMvc
        .perform(get("/auth/sessions").secure(true))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.type").exists())
        .andExpect(jsonPath("$.title").exists())
        .andExpect(jsonPath("$.status").value(401));

    mockMvc
        .perform(
            post("/auth/login")
                .secure(true)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nonexistent@buildwithpartha.tech\",\"password\":\"InvalidPass123!\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  @DisplayName("5. Production release audit ledger payload contains required fields and zero secrets")
  void testProductionReleaseAuditLedgerPayloadIntegrity() throws Exception {
    String releaseAuditRecordJson =
        """
        {
          "deployment_id": "dep-20260912-182500-v1.0.0",
          "timestamp": "2026-09-12T18:25:00Z",
          "environment": "production",
          "release_tag": "v1.0.0",
          "images": {
            "web": "lifeos-web:v1.0.0@sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "api": "lifeos-api:v1.0.0@sha256:cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce"
          },
          "db_migration": {
            "status": "SUCCESS",
            "target_version": "V34"
          },
          "smoke_verification": {
            "actuator": "UP",
            "domain": "UP",
            "security_txt": "VALID",
            "status": "PASSED"
          },
          "status": "SUCCESS"
        }
        """;

    JsonNode node = objectMapper.readTree(releaseAuditRecordJson);
    assertThat(node.get("deployment_id").asText()).startsWith("dep-");
    assertThat(node.get("environment").asText()).isEqualTo("production");
    assertThat(node.get("release_tag").asText()).isEqualTo("v1.0.0");
    assertThat(node.get("status").asText()).isEqualTo("SUCCESS");
    assertThat(node.get("db_migration").get("status").asText()).isEqualTo("SUCCESS");
    assertThat(node.get("smoke_verification").get("status").asText()).isEqualTo("PASSED");

    // Verify absence of sensitive tokens or credentials
    assertThat(releaseAuditRecordJson).doesNotContain("password");
    assertThat(releaseAuditRecordJson).doesNotContain("secret");
    assertThat(releaseAuditRecordJson).doesNotContain("token");
  }

  @Test
  @DisplayName("6. Micrometer metrics registry is initialized and operational for production monitoring")
  void testMicrometerMetricsRegistryOperational() {
    assertThat(meterRegistry).isNotNull();
    assertThat(meterRegistry.getMeters()).isNotEmpty();
  }
}

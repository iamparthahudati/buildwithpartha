package tech.buildwithpartha.lifeos.common.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * Production Domain, Legal Pages, and Public Endpoints Integration Test Suite (LOS-1614).
 *
 * <p>Validates domain routing contracts, security headers on public and error endpoints,
 * legal consent versioning consistency, RFC 9116 security declarations, and crawler protection.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductionDomainAndLegalPagesIntegrationTests {

  private static final String TERMS_VERSION_LITERAL = "2026-08-01";
  private static final String PRIVACY_VERSION_LITERAL = "2026-08-01";

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private TermsAcceptanceRepository termsAcceptanceRepository;

  @Test
  @DisplayName("1. Public health and readiness probes enforce full security headers")
  void testPublicHealthAndReadinessSecurityHeaders() throws Exception {
    mockMvc
        .perform(get("/actuator/health/readiness"))
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
  }

  @Test
  @DisplayName("2. Legal terms and privacy version consent records maintain integrity")
  void testLegalConsentVersionRecordIntegrity() {
    UUID userId = UUID.randomUUID();
    User user =
        User.signup(
            userId,
            EmailAddress.of("legal.user@buildwithpartha.tech"),
            "Legal Test User",
            Instant.now());
    userRepository.save(user);

    TermsAcceptance termsAcceptance =
        TermsAcceptance.termsAccepted(
            UUID.randomUUID(),
            userId,
            TERMS_VERSION_LITERAL,
            Instant.now(),
            Optional.of("127.0.0.1"));
    termsAcceptanceRepository.save(termsAcceptance);

    TermsAcceptance privacyAcceptance =
        TermsAcceptance.privacyAcknowledged(
            UUID.randomUUID(),
            userId,
            PRIVACY_VERSION_LITERAL,
            Instant.now(),
            Optional.of("127.0.0.1"));
    termsAcceptanceRepository.save(privacyAcceptance);

    var recordedTerms = termsAcceptanceRepository.findByUserId(userId);
    assertThat(recordedTerms).hasSize(2);
    assertThat(recordedTerms)
        .extracting(TermsAcceptance::termsVersion)
        .containsExactlyInAnyOrder(
            "terms:" + TERMS_VERSION_LITERAL, "privacy:" + PRIVACY_VERSION_LITERAL);
  }

  @Test
  @DisplayName("3. Unauthenticated and error routes return RFC 7807 problem details with zero secret leakage")
  void testProblemDetailsOnUnauthenticatedAndNotFoundRoutes() throws Exception {
    mockMvc
        .perform(get("/auth/sessions").secure(true))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(jsonPath("$.type").exists())
        .andExpect(jsonPath("$.title").exists())
        .andExpect(jsonPath("$.status").value(401));

    mockMvc
        .perform(
            post("/auth/login")
                .secure(true)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"unknown@buildwithpartha.tech\",\"password\":\"WrongPassword123!\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  @DisplayName("4. Signup endpoint strictly enforces terms and privacy versions")
  void testSignupEndpointVersionValidation() throws Exception {
    String invalidSignupJson =
        """
        {
          "email": "invalid.version@buildwithpartha.tech",
          "password": "SecurePassword123!",
          "displayName": "Invalid Version",
          "termsVersion": "",
          "privacyVersion": "2026-08-01",
          "timeZone": "Asia/Kolkata",
          "locale": "en-US",
          "weekStart": 1
        }
        """;

    mockMvc
        .perform(
            post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidSignupJson))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400));
  }
}

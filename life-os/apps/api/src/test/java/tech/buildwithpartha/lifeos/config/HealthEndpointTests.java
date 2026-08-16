package tech.buildwithpartha.lifeos.config;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class HealthEndpointTests {

  private static final MediaType ACTUATOR_JSON =
      MediaType.parseMediaType("application/vnd.spring-boot.actuator.v3+json");
  private static final String UUID_PATTERN =
      "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

  private final MockMvc mockMvc;

  @Autowired
  HealthEndpointTests(MockMvc mockMvc) {
    this.mockMvc = mockMvc;
  }

  @Test
  void exposesDetailFreeLivenessAndReadiness() throws Exception {
    mockMvc
        .perform(get("/actuator/health/liveness"))
        .andExpect(status().isOk())
        .andExpect(content().contentType(ACTUATOR_JSON))
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist())
        .andExpect(header().string(CorrelationIdFilter.HEADER_NAME, matchesPattern(UUID_PATTERN)));

    mockMvc
        .perform(
            get("/actuator/health/readiness")
                .header(CorrelationIdFilter.HEADER_NAME, "health-probe-123"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist())
        .andExpect(header().string(CorrelationIdFilter.HEADER_NAME, "health-probe-123"));
  }

  @Test
  void deniesActuatorDiscoveryAndNonProbeEndpoints() throws Exception {
    mockMvc
        .perform(get("/actuator"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

    mockMvc
        .perform(get("/actuator/info"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
  }

  @Test
  @WithMockUser
  void deniesActuatorRootEvenToAuthenticatedUsers() throws Exception {
    mockMvc
        .perform(get("/actuator/health"))
        .andExpect(status().isForbidden())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }
}

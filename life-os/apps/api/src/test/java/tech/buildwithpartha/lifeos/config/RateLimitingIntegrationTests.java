package tech.buildwithpartha.lifeos.config;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimitPolicy;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Import(RateLimitingIntegrationTests.RateLimitingFixtureController.class)
class RateLimitingIntegrationTests {

  private final MockMvc mockMvc;

  @Autowired
  RateLimitingIntegrationTests(MockMvc mockMvc) {
    this.mockMvc = mockMvc;
  }

  @Test
  @WithMockUser
  void includesRetryAfterHeaderOnRateLimitedResponse() throws Exception {
    mockMvc
        .perform(get("/test/ratelimit/trigger-error"))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
        .andExpect(jsonPath("$.status").value(429));
  }

  @Test
  @WithMockUser
  void enforcesSearchPolicyLimit() throws Exception {
    int limit = RateLimitPolicy.searchPolicy().maxRequests();
    String testIp = "203.0.113.100";

    for (int i = 0; i < limit; i++) {
      mockMvc
          .perform(get("/test/ratelimit/search").header("X-Forwarded-For", testIp))
          .andExpect(status().isOk());
    }

    mockMvc
        .perform(get("/test/ratelimit/search").header("X-Forwarded-For", testIp))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
  }

  @Test
  @WithMockUser
  void enforcesExportPolicyLimit() throws Exception {
    int limit = RateLimitPolicy.exportPolicy().maxRequests();
    String testIp = "203.0.113.101";

    for (int i = 0; i < limit; i++) {
      mockMvc
          .perform(get("/test/ratelimit/export").header("X-Forwarded-For", testIp))
          .andExpect(status().isOk());
    }

    mockMvc
        .perform(get("/test/ratelimit/export").header("X-Forwarded-For", testIp))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"));
  }

  @Test
  @WithMockUser
  void enforcesWritePolicyLimit() throws Exception {
    int limit = RateLimitPolicy.writePolicy().maxRequests();
    String testIp = "203.0.113.102";

    for (int i = 0; i < limit; i++) {
      mockMvc
          .perform(post("/test/ratelimit/write").with(csrf()).header("X-Forwarded-For", testIp))
          .andExpect(status().isOk());
    }

    mockMvc
        .perform(post("/test/ratelimit/write").with(csrf()).header("X-Forwarded-For", testIp))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"));
  }

  @RestController
  @RequestMapping("/test/ratelimit")
  static class RateLimitingFixtureController {

    @GetMapping("/trigger-error")
    void triggerError() {
      throw new RateLimitedException("Test rate limit breach");
    }

    @GetMapping("/search")
    String search() {
      return "search-results";
    }

    @GetMapping("/export")
    String exportData() {
      return "export-data";
    }

    @PostMapping("/write")
    String writeData() {
      return "write-success";
    }
  }
}

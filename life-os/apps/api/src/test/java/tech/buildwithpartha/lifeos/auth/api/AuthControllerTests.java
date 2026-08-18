package tech.buildwithpartha.lifeos.auth.api;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Exercises {@code POST /auth/signup} through the real filter chain (no {@code @WithMockUser}: the
 * whole point of the endpoint is that it is reachable without a session) and the real {@code
 * SignupService}/JPA/Argon2/wordlist beans, matching the full-context style {@code
 * ApiProblemResponseTests} and {@code OpenApiArtifactTests} already use.
 *
 * <p>Every test here that reaches {@code SignupService} spends one unit of {@code
 * InMemorySignupRateLimiter}'s budget for MockMvc's constant {@code 127.0.0.1} caller address; this
 * class deliberately keeps its total signup-triggering calls at 4, comfortably under the
 * 5-per-window limit, since the rate limiter bean is a test-class-scoped Spring singleton.
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

  private static final String VALID_BODY =
      """
      {
        "email": "%s",
        "password": "a genuinely unusual passphrase 2026",
        "displayName": "New User",
        "termsVersion": "2026-08-01",
        "privacyVersion": "2026-08-01"
      }
      """;

  private final MockMvc mockMvc;

  @Autowired
  AuthControllerTests(MockMvc mockMvc) {
    this.mockMvc = mockMvc;
  }

  @Test
  void signupIsReachableWithoutAuthenticationAndReturnsTheGenericAcceptedResponse()
      throws Exception {
    mockMvc
        .perform(
            post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY.formatted("controller-happy-path@example.test")))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));
  }

  @Test
  void rejectsAnInvalidEmailWithoutReachingTheRateLimiter() throws Exception {
    mockMvc
        .perform(
            post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY.formatted("not-an-email")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[?(@.field == 'email')]").exists());
  }

  @Test
  void reportsAPasswordPolicyViolationAsASafeFieldProblem() throws Exception {
    String body =
        """
        {
          "email": "controller-weak-password@example.test",
          "password": "short",
          "displayName": "New User",
          "termsVersion": "2026-08-01",
          "privacyVersion": "2026-08-01"
        }
        """;

    mockMvc
        .perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[?(@.field == 'password')]").exists())
        .andExpect(content().string(not(containsString("short"))));
  }

  @Test
  void aRepeatedSignupForTheSameEmailReturnsTheSameGenericResponse() throws Exception {
    String body = VALID_BODY.formatted("controller-duplicate@example.test");

    mockMvc
        .perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));

    mockMvc
        .perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));
  }
}

package tech.buildwithpartha.lifeos.config;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.ErrorCode;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Import(ApiProblemResponseTests.ErrorFixtureController.class)
class ApiProblemResponseTests {

  private final MockMvc mockMvc;

  @Autowired
  ApiProblemResponseTests(MockMvc mockMvc) {
    this.mockMvc = mockMvc;
  }

  @Test
  @WithMockUser
  void mapsCodedFailuresWithoutLeakingDiagnosticMessages() throws Exception {
    mockMvc
        .perform(get("/test/errors/coded").header(CorrelationIdFilter.HEADER_NAME, "request-123"))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(header().string(CorrelationIdFilter.HEADER_NAME, "request-123"))
        .andExpect(jsonPath("$.type").value(containsString("/problems/v1/task-conflict")))
        .andExpect(jsonPath("$.title").value("Request rejected"))
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.detail").value("The request could not be completed."))
        .andExpect(jsonPath("$.instance").value("/test/errors/coded"))
        .andExpect(jsonPath("$.code").value("TASK_CONFLICT"))
        .andExpect(jsonPath("$.correlationId").value("request-123"))
        .andExpect(jsonPath("$.errors").doesNotExist())
        .andExpect(content().string(not(containsString("database-secret-diagnostic"))))
        .andExpect(content().string(not(containsString("stackTrace"))));
  }

  @Test
  @WithMockUser
  void returnsFieldCodesWithoutRejectedValues() throws Exception {
    mockMvc
        .perform(
            post("/test/errors/validation")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"sensitive rejected value\",\"count\":0}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("count"))
        .andExpect(jsonPath("$.errors[0].code").value("Min"))
        .andExpect(content().string(not(containsString("sensitive rejected value"))));
  }

  @Test
  @WithMockUser
  void mapsUnreadableBodiesAndMissingResources() throws Exception {
    mockMvc
        .perform(
            post("/test/errors/validation")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{not-json"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
        .andExpect(content().string(not(containsString("not-json"))));

    mockMvc
        .perform(get("/missing-resource"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  @WithMockUser
  void mapsUnexpectedFailuresWithoutStackTraceOrCauseLeakage() throws Exception {
    mockMvc
        .perform(get("/test/errors/unexpected"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
        .andExpect(jsonPath("$.detail").value("The request could not be completed."))
        .andExpect(content().string(not(containsString("token-secret-cause"))))
        .andExpect(content().string(not(containsString("exception"))))
        .andExpect(content().string(not(containsString("trace"))));
  }

  @Test
  void mapsAuthenticationFailuresAndReplacesUnsafeCorrelationIds() throws Exception {
    mockMvc
        .perform(
            get("/test/errors/coded")
                .header(CorrelationIdFilter.HEADER_NAME, "unsafe correlation value"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"))
        .andExpect(jsonPath("$.correlationId").value(not("unsafe correlation value")))
        .andExpect(
            header().string(CorrelationIdFilter.HEADER_NAME, not("unsafe correlation value")))
        .andExpect(content().string(not(containsString("unsafe correlation value"))));
  }

  @RestController
  @RequestMapping("/test/errors")
  static class ErrorFixtureController {

    @GetMapping("/coded")
    void coded() {
      throw new FixtureCodedException();
    }

    @PostMapping("/validation")
    void validation(@Valid @RequestBody FixtureRequest request) {}

    @GetMapping("/unexpected")
    void unexpected() {
      throw new IllegalStateException("token-secret-cause");
    }
  }

  record FixtureRequest(@NotBlank String title, @Min(1) int count) {}

  private static final class FixtureCodedException extends CodedException {

    private FixtureCodedException() {
      super(ErrorCode.of("TASK_CONFLICT"), "database-secret-diagnostic");
    }
  }
}

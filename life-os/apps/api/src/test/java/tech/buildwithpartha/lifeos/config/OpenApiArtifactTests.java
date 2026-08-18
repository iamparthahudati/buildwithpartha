package tech.buildwithpartha.lifeos.config;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class OpenApiArtifactTests {

  private static final Path ARTIFACT = Path.of("build/openapi/life-os-openapi.json");
  private static final String RESPONSE_SCHEMA_SUFFIX =
      ".content['application/problem+json'].schema.$ref";

  private final MockMvc mockMvc;

  @Autowired
  OpenApiArtifactTests(MockMvc mockMvc) {
    this.mockMvc = mockMvc;
  }

  @Test
  void requiresAuthenticationForTheRuntimeDocument() throws Exception {
    mockMvc.perform(get("/openapi")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser
  void validatesAndWritesTheBaselineIncludingSignupEmailVerificationLoginAndLogout()
      throws Exception {
    MvcResult result =
        mockMvc
            .perform(get("/openapi"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.openapi").value(matchesPattern("^3\\.1\\..+")))
            .andExpect(jsonPath("$.info.title").value("LifeOS API"))
            .andExpect(jsonPath("$.info.version").value("v1"))
            .andExpect(jsonPath("$.info.description").value(containsString("CSRF header")))
            .andExpect(jsonPath("$.servers[0].url").value("/life-os/api/v1"))
            .andExpect(jsonPath("$.paths").isMap())
            .andExpect(jsonPath("$.paths['/auth/signup'].post.operationId").value("signup"))
            .andExpect(jsonPath("$.paths['/auth/signup'].post.security").isEmpty())
            .andExpect(jsonPath("$.paths['/auth/signup'].post.responses['202'].content").exists())
            .andExpect(
                jsonPath("$.paths['/auth/signup'].post.responses['400'].$ref")
                    .value("#/components/responses/BadRequest"))
            .andExpect(
                jsonPath("$.paths['/auth/signup'].post.responses['429'].$ref")
                    .value("#/components/responses/TooManyRequests"))
            .andExpect(jsonPath("$.components.responses.TooManyRequests").exists())
            .andExpect(
                jsonPath("$.paths['/auth/verify-email'].post.operationId").value("verifyEmail"))
            .andExpect(jsonPath("$.paths['/auth/verify-email'].post.security").isEmpty())
            .andExpect(
                jsonPath("$.paths['/auth/verify-email'].post.responses['200'].content").exists())
            .andExpect(
                jsonPath("$.paths['/auth/verify-email'].post.responses['400'].$ref")
                    .value("#/components/responses/BadRequest"))
            .andExpect(
                jsonPath("$.paths['/auth/verify-email'].post.responses['409'].$ref")
                    .value("#/components/responses/Conflict"))
            .andExpect(jsonPath("$.components.responses.Conflict").exists())
            .andExpect(jsonPath("$.paths['/auth/login'].post.operationId").value("login"))
            .andExpect(jsonPath("$.paths['/auth/login'].post.security").isEmpty())
            .andExpect(jsonPath("$.paths['/auth/login'].post.responses['200'].content").exists())
            .andExpect(
                jsonPath("$.paths['/auth/login'].post.responses['401'].$ref")
                    .value("#/components/responses/Unauthorized"))
            .andExpect(
                jsonPath("$.paths['/auth/login'].post.responses['429'].$ref")
                    .value("#/components/responses/TooManyRequests"))
            .andExpect(jsonPath("$.components.responses.Unauthorized").exists())
            .andExpect(jsonPath("$.paths['/auth/logout'].post.operationId").value("logout"))
            .andExpect(jsonPath("$.paths['/auth/logout'].post.security").isEmpty())
            .andExpect(jsonPath("$.paths['/auth/logout'].post.responses['200'].content").exists())
            .andExpect(
                jsonPath("$.paths['/auth/logout'].post.responses['403'].$ref")
                    .value("#/components/responses/Forbidden"))
            .andExpect(jsonPath("$.paths['/auth/logout-all'].post.operationId").value("logoutAll"))
            .andExpect(jsonPath("$.paths['/auth/logout-all'].post.security").isEmpty())
            .andExpect(
                jsonPath("$.paths['/auth/logout-all'].post.responses['200'].content").exists())
            .andExpect(jsonPath("$.components.responses.Forbidden").exists())
            .andExpect(jsonPath("$.components.securitySchemes.sessionCookie.in").value("cookie"))
            .andExpect(
                jsonPath("$.components.securitySchemes.csrfToken.name").value("X-CSRF-TOKEN"))
            .andExpect(
                jsonPath("$.components.schemas.Problem.required")
                    .value(
                        hasItems(
                            "type",
                            "title",
                            "status",
                            "detail",
                            "instance",
                            "code",
                            "correlationId")))
            .andExpect(
                jsonPath("$.components.schemas.PageResponse.required")
                    .value(hasItems("items", "page", "size", "totalItems", "totalPages")))
            .andExpect(
                jsonPath("$.components.responses.BadRequest" + RESPONSE_SCHEMA_SUFFIX)
                    .value("#/components/schemas/Problem"))
            .andExpect(
                jsonPath("$.components.responses.InternalError" + RESPONSE_SCHEMA_SUFFIX)
                    .value("#/components/schemas/Problem"))
            .andReturn();

    Files.createDirectories(ARTIFACT.getParent());
    Files.writeString(
        ARTIFACT,
        result.getResponse().getContentAsString(StandardCharsets.UTF_8) + System.lineSeparator(),
        StandardCharsets.UTF_8);
  }
}

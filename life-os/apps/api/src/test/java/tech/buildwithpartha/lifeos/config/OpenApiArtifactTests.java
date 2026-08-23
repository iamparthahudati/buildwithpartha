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
  void validatesAndWritesTheBaselineIncludingSignupEmailVerificationLoginLogoutAndPasswordReset()
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
            .andExpect(
                jsonPath("$.paths['/auth/resend-verification'].post.operationId")
                    .value("resendVerification"))
            .andExpect(jsonPath("$.paths['/auth/resend-verification'].post.security").isEmpty())
            .andExpect(
                jsonPath("$.paths['/auth/resend-verification'].post.responses['202'].content")
                    .exists())
            .andExpect(
                jsonPath("$.paths['/auth/resend-verification'].post.responses['400'].$ref")
                    .value("#/components/responses/BadRequest"))
            .andExpect(
                jsonPath("$.paths['/auth/resend-verification'].post.responses['429'].$ref")
                    .value("#/components/responses/TooManyRequests"))
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
            .andExpect(
                jsonPath("$.paths['/auth/forgot-password'].post.operationId")
                    .value("forgotPassword"))
            .andExpect(jsonPath("$.paths['/auth/forgot-password'].post.security").isEmpty())
            .andExpect(
                jsonPath("$.paths['/auth/forgot-password'].post.responses['202'].content").exists())
            .andExpect(
                jsonPath("$.paths['/auth/reset-password'].post.operationId").value("resetPassword"))
            .andExpect(jsonPath("$.paths['/auth/reset-password'].post.security").isEmpty())
            .andExpect(
                jsonPath("$.paths['/auth/reset-password'].post.responses['200'].content").exists())
            .andExpect(
                jsonPath("$.paths['/auth/reset-password'].post.responses['409'].$ref")
                    .value("#/components/responses/Conflict"))
            .andExpect(jsonPath("$.paths['/onboarding'].get.operationId").value("getOnboarding"))
            .andExpect(
                jsonPath("$.paths['/onboarding/welcome'].put.operationId").value("updateWelcome"))
            .andExpect(
                jsonPath("$.paths['/onboarding/time-and-week'].put.operationId")
                    .value("updateTimeAndWeek"))
            .andExpect(
                jsonPath("$.paths['/onboarding/planning-defaults'].put.operationId")
                    .value("updatePlanningDefaults"))
            .andExpect(
                jsonPath("$.paths['/onboarding/complete'].post.operationId")
                    .value("completeOnboarding"))
            .andExpect(jsonPath("$.paths['/user/profile'].get.operationId").value("getProfile"))
            .andExpect(jsonPath("$.paths['/user/profile'].put.operationId").value("updateProfile"))
            .andExpect(
                jsonPath("$.paths['/user/preferences'].get.operationId").value("getPreferences"))
            .andExpect(
                jsonPath("$.paths['/user/preferences'].put.operationId").value("updatePreferences"))
            .andExpect(jsonPath("$.paths['/today'].get.operationId").value("getToday"))
            .andExpect(jsonPath("$.components.schemas.TodayResponse").exists())
            .andExpect(jsonPath("$.components.schemas.MitWidget").exists())
            .andExpect(jsonPath("$.components.schemas.TasksWidget").exists())
            .andExpect(
                jsonPath("$.paths['/tasks/{id}/detail'].get.operationId").value("getTaskDetail"))
            .andExpect(
                jsonPath("$.paths['/tasks/{id}/detail'].get.responses['401'].$ref")
                    .value("#/components/responses/Unauthorized"))
            .andExpect(
                jsonPath("$.paths['/tasks/{id}/detail'].get.responses['404'].$ref")
                    .value("#/components/responses/NotFound"))
            .andExpect(jsonPath("$.components.schemas.TaskDetailResponse").exists())
            .andExpect(
                jsonPath("$.components.schemas.TaskDetailResponse.properties.version.format")
                    .value("int64"))
            .andExpect(
                jsonPath("$.components.schemas.TaskDetailResponse.required")
                    .value(hasItems("task", "dependencies", "counts", "version")))
            .andExpect(jsonPath("$.components.schemas.TaskDetailCountsResponse").exists())
            .andExpect(
                jsonPath("$.components.schemas.TaskDetailCountsResponse.required")
                    .value(
                        hasItems(
                            "linkedTimeBlockCount",
                            "focusSessionCount",
                            "commentCount",
                            "attachmentCount",
                            "activityEventCount")))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments'].get.operationId")
                    .value("listTaskComments"))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments'].post.operationId")
                    .value("createTaskComment"))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments'].post.security[0].sessionCookie")
                    .isArray())
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments'].post.security[0].csrfToken")
                    .isArray())
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments/{commentId}'].get.operationId")
                    .value("getTaskComment"))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments/{commentId}'].put.operationId")
                    .value("updateTaskComment"))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments/{commentId}'].delete.operationId")
                    .value("deleteTaskComment"))
            .andExpect(
                jsonPath("$.paths['/projects/{projectId}/comments'].get.operationId")
                    .value("listProjectComments"))
            .andExpect(
                jsonPath("$.paths['/projects/{projectId}/comments'].post.operationId")
                    .value("createProjectComment"))
            .andExpect(
                jsonPath("$.paths['/projects/{projectId}/comments/{commentId}'].put.operationId")
                    .value("updateProjectComment"))
            .andExpect(
                jsonPath("$.paths['/projects/{projectId}/comments/{commentId}'].delete.operationId")
                    .value("deleteProjectComment"))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/comments'].post.responses['400'].$ref")
                    .value("#/components/responses/BadRequest"))
            .andExpect(
                jsonPath(
                        "$.paths['/tasks/{taskId}/comments/{commentId}'].put.responses['409'].$ref")
                    .value("#/components/responses/Conflict"))
            .andExpect(jsonPath("$.components.schemas.CreateCommentRequest").exists())
            .andExpect(jsonPath("$.components.schemas.UpdateCommentRequest").exists())
            .andExpect(jsonPath("$.components.schemas.CommentResponse").exists())
            .andExpect(
                jsonPath("$.components.schemas.CommentResponse.required")
                    .value(
                        hasItems(
                            "id",
                            "authorId",
                            "parentType",
                            "parentId",
                            "body",
                            "format",
                            "createdAt",
                            "updatedAt",
                            "version",
                            "canEdit",
                            "canDelete")))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/activity'].get.operationId")
                    .value("listTaskActivity"))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/activity'].get.responses['400'].$ref")
                    .value("#/components/responses/BadRequest"))
            .andExpect(
                jsonPath("$.paths['/tasks/{taskId}/activity'].get.responses['404'].$ref")
                    .value("#/components/responses/NotFound"))
            .andExpect(
                jsonPath("$.paths['/projects/{projectId}/activity'].get.operationId")
                    .value("listProjectActivity"))
            .andExpect(jsonPath("$.components.schemas.ActivityEventResponse").exists())
            .andExpect(jsonPath("$.components.schemas.ActivityObjectResponse").exists())
            .andExpect(
                jsonPath("$.components.schemas.ActivityEventResponse.required")
                    .value(hasItems("id", "actorUserId", "eventType", "occurredAt")))
            .andExpect(
                jsonPath("$.components.schemas.ActivityEventResponse.properties.object").exists())
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

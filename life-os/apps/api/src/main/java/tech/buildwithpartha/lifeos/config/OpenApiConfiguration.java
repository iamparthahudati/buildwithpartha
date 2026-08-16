package tech.buildwithpartha.lifeos.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Defines the stable, empty-first OpenAPI contract shared by every product endpoint. */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {

  static final String API_SERVER = "/life-os/api/v1";
  static final String PROBLEM_SCHEMA = "Problem";
  static final String SESSION_SCHEME = "sessionCookie";
  static final String CSRF_SCHEME = "csrfToken";

  @Bean
  OpenAPI lifeOsOpenApi() {
    Components components =
        new Components()
            .addSecuritySchemes(SESSION_SCHEME, sessionScheme())
            .addSecuritySchemes(CSRF_SCHEME, csrfScheme())
            .addSchemas("FieldProblem", fieldProblemSchema())
            .addSchemas(PROBLEM_SCHEMA, problemSchema())
            .addSchemas("PageResponse", pageResponseSchema())
            .addResponses("BadRequest", problemResponse("The request is invalid."))
            .addResponses("Unauthorized", problemResponse("Authentication is required."))
            .addResponses("Forbidden", problemResponse("The action is not permitted."))
            .addResponses("NotFound", problemResponse("The resource is unavailable."))
            .addResponses("Conflict", problemResponse("The request conflicts with current state."))
            .addResponses("InternalError", problemResponse("The request could not be completed."));

    return new OpenAPI()
        .info(
            new Info()
                .title("LifeOS API")
                .version("v1")
                .description(
                    "Same-origin private LifeOS API. Browser sessions use an HttpOnly cookie; "
                        + "every state-changing request also requires the CSRF header."))
        .servers(List.of(new Server().url(API_SERVER).description("Same-origin API base")))
        .components(components)
        .security(List.of(new SecurityRequirement().addList(SESSION_SCHEME)));
  }

  private static SecurityScheme sessionScheme() {
    return new SecurityScheme()
        .type(SecurityScheme.Type.APIKEY)
        .in(SecurityScheme.In.COOKIE)
        .name("lifeos_session")
        .description("Opaque HttpOnly browser session cookie. Frontend code never reads it.");
  }

  private static SecurityScheme csrfScheme() {
    return new SecurityScheme()
        .type(SecurityScheme.Type.APIKEY)
        .in(SecurityScheme.In.HEADER)
        .name("X-CSRF-TOKEN")
        .description("Required together with the session cookie for state-changing requests.");
  }

  private static Schema<?> fieldProblemSchema() {
    return new ObjectSchema()
        .description("Safe field-level validation metadata; rejected values are never included.")
        .addProperty("field", new StringSchema())
        .addProperty("code", new StringSchema())
        .addRequiredItem("field")
        .addRequiredItem("code")
        .additionalProperties(false);
  }

  private static Schema<?> problemSchema() {
    return new ObjectSchema()
        .description("Versioned RFC Problem Details response with safe LifeOS extensions.")
        .addProperty("type", new StringSchema().format("uri"))
        .addProperty("title", new StringSchema())
        .addProperty("status", new IntegerSchema().format("int32"))
        .addProperty("detail", new StringSchema())
        .addProperty("instance", new StringSchema().format("uri-reference"))
        .addProperty("code", new StringSchema().pattern("^[A-Z][A-Z0-9_]*$"))
        .addProperty("correlationId", new StringSchema())
        .addProperty(
            "errors", new ArraySchema().items(reference("#/components/schemas/FieldProblem")))
        .addRequiredItem("type")
        .addRequiredItem("title")
        .addRequiredItem("status")
        .addRequiredItem("detail")
        .addRequiredItem("instance")
        .addRequiredItem("code")
        .addRequiredItem("correlationId")
        .additionalProperties(false);
  }

  private static Schema<?> pageResponseSchema() {
    return new ObjectSchema()
        .description("Zero-based page envelope; item schemas are supplied by each operation.")
        .addProperty("items", new ArraySchema().items(new Schema<>()))
        .addProperty("page", new IntegerSchema().format("int32").minimum(BigDecimal.ZERO))
        .addProperty("size", new IntegerSchema().format("int32").minimum(BigDecimal.ONE))
        .addProperty("totalItems", new IntegerSchema().format("int64").minimum(BigDecimal.ZERO))
        .addProperty("totalPages", new IntegerSchema().format("int32").minimum(BigDecimal.ZERO))
        .addRequiredItem("items")
        .addRequiredItem("page")
        .addRequiredItem("size")
        .addRequiredItem("totalItems")
        .addRequiredItem("totalPages")
        .additionalProperties(false);
  }

  private static ApiResponse problemResponse(String description) {
    io.swagger.v3.oas.models.media.MediaType mediaType =
        new io.swagger.v3.oas.models.media.MediaType()
            .schema(reference("#/components/schemas/Problem"));
    return new ApiResponse()
        .description(description)
        .content(
            new io.swagger.v3.oas.models.media.Content()
                .addMediaType("application/problem+json", mediaType));
  }

  private static Schema<?> reference(String value) {
    return new Schema<>().$ref(value);
  }
}

package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import tech.buildwithpartha.lifeos.common.error.ApiProblem;
import tech.buildwithpartha.lifeos.common.error.ErrorCode;
import tech.buildwithpartha.lifeos.common.error.StandardErrorCodes;
import tools.jackson.databind.ObjectMapper;

/** Restricts actuator access and returns API-shaped authentication/authorization failures. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ApiSecurityConfiguration {

  private final ApiProblemFactory problemFactory;
  private final ObjectMapper objectMapper;

  public ApiSecurityConfiguration(ApiProblemFactory problemFactory, ObjectMapper objectMapper) {
    this.problemFactory = problemFactory;
    this.objectMapper = objectMapper;
  }

  @Bean
  SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(
            requests ->
                requests
                    .requestMatchers(
                        HttpMethod.GET, "/actuator/health/liveness", "/actuator/health/readiness")
                    .permitAll()
                    .requestMatchers("/actuator/**")
                    .denyAll()
                    .requestMatchers(HttpMethod.POST, "/auth/signup")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        // Spring Security's default CSRF protection is session-bound
        // (HttpSessionCsrfTokenRepository) and this application has no HttpSession-based login
        // yet — signup is pre-session by definition, and LOS-0505 owns the real cookie/CSRF
        // bootstrap scheme 06-SECURITY.md describes (the `X-CSRF-TOKEN` header already documented
        // in OpenApiConfiguration). Disabling the incompatible default here is a deliberate,
        // narrow decision, not a broader opt-out of CSRF protection.
        .csrf(AbstractHttpConfigurer::disable)
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(
                        (request, response, exception) ->
                            writeProblem(
                                request,
                                response,
                                HttpStatus.UNAUTHORIZED,
                                StandardErrorCodes.AUTHENTICATION_REQUIRED,
                                "Authentication required",
                                "Sign in to continue."))
                    .accessDeniedHandler(
                        (request, response, exception) ->
                            writeProblem(
                                request,
                                response,
                                HttpStatus.FORBIDDEN,
                                StandardErrorCodes.ACCESS_DENIED,
                                "Access denied",
                                "You do not have permission to perform this action.")))
        .requestCache(cache -> cache.disable())
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable);

    return http.build();
  }

  private void writeProblem(
      HttpServletRequest request,
      HttpServletResponse response,
      HttpStatus status,
      ErrorCode code,
      String title,
      String detail)
      throws IOException {
    ApiProblem problem = problemFactory.create(request, status, code, title, detail);
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    objectMapper.writeValue(response.getOutputStream(), problem);
  }
}

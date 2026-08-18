package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
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
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;

  public ApiSecurityConfiguration(
      ApiProblemFactory problemFactory,
      ObjectMapper objectMapper,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      Clock clock) {
    this.problemFactory = problemFactory;
    this.objectMapper = objectMapper;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
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
                    .requestMatchers(
                        HttpMethod.POST,
                        "/auth/signup",
                        "/auth/verify-email",
                        "/auth/login",
                        "/auth/logout",
                        "/auth/logout-all",
                        "/auth/forgot-password",
                        "/auth/reset-password")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        // Spring Security's default CSRF protection is session-bound
        // (HttpSessionCsrfTokenRepository) and this application has no HttpSession-based login —
        // it uses the opaque cookie-bound scheme LOS-0505 built (SessionAuthenticationFilter plus
        // the X-CSRF-TOKEN header already documented in OpenApiConfiguration). Disabling the
        // incompatible default here is a deliberate, narrow decision, not a broader opt-out of
        // CSRF protection: logout/logout-all (LOS-0506) are permitAll rather than authenticated()
        // specifically so they stay safely callable with no session at all (idempotent logout),
        // so their CSRF check happens inside LogoutService itself, not this filter chain.
        .csrf(AbstractHttpConfigurer::disable)
        .addFilterBefore(
            new SessionAuthenticationFilter(sessionRepository, tokenGenerator, clock),
            AuthorizationFilter.class)
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

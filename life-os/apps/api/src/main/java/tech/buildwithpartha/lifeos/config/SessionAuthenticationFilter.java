package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.common.error.ApiProblem;
import tech.buildwithpartha.lifeos.common.error.ErrorCode;
import tech.buildwithpartha.lifeos.common.error.StandardErrorCodes;
import tools.jackson.databind.ObjectMapper;

/**
 * Reads the {@code lifeos_session} cookie and authenticates active sessions (LOS-0505, LOS-0508).
 *
 * <p>For mutating requests on authenticated routes, verifies the {@code X-CSRF-TOKEN} header
 * matches the session's CSRF secret before proceeding (LOS-0513, 05-API-CONVENTIONS.md).
 */
class SessionAuthenticationFilter extends OncePerRequestFilter {

  static final String SESSION_COOKIE_NAME = "lifeos_session";
  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";
  private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
  private static final Set<String> UNPROTECTED_AUTH_PATHS =
      Set.of(
          "/auth/signup",
          "/auth/verify-email",
          "/auth/resend-verification",
          "/auth/login",
          "/auth/forgot-password",
          "/auth/reset-password",
          "/auth/cancel-deletion",
          "/auth/logout",
          "/auth/logout-all");

  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;
  private final ApiProblemFactory problemFactory;
  private final ObjectMapper objectMapper;

  SessionAuthenticationFilter(
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      Clock clock,
      ApiProblemFactory problemFactory,
      ObjectMapper objectMapper) {
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
    this.problemFactory = problemFactory;
    this.objectMapper = objectMapper;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    Optional<Session> activeSession =
        sessionCookieValue(request)
            .map(tokenGenerator::hash)
            .flatMap(sessionRepository::findByTokenHash)
            .filter(session -> session.isActive(clock.instant()));

    if (activeSession.isPresent()) {
      Session session = activeSession.get();

      if (requiresCsrfValidation(request)) {
        String csrfHeader = request.getHeader(CSRF_HEADER_NAME);
        boolean matches =
            csrfHeader != null
                && !csrfHeader.isBlank()
                && session.csrfSecretHash().equals(tokenGenerator.hash(csrfHeader));

        if (!matches) {
          writeProblem(
              request,
              response,
              HttpStatus.FORBIDDEN,
              StandardErrorCodes.CSRF_TOKEN_INVALID,
              "CSRF token invalid",
              "Refresh and try again.");
          return;
        }
      }

      SecurityContextHolder.getContext()
          .setAuthentication(
              new UsernamePasswordAuthenticationToken(session.userId(), null, List.of()));
    }

    filterChain.doFilter(request, response);
  }

  private boolean requiresCsrfValidation(HttpServletRequest request) {
    if (!MUTATING_METHODS.contains(request.getMethod())) {
      return false;
    }
    String path = request.getRequestURI();
    return !UNPROTECTED_AUTH_PATHS.contains(path);
  }

  private static Optional<String> sessionCookieValue(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return Optional.empty();
    }
    return Arrays.stream(cookies)
        .filter(cookie -> SESSION_COOKIE_NAME.equals(cookie.getName()))
        .map(Cookie::getValue)
        .findFirst();
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

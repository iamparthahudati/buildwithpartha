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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;

/**
 * The counterpart {@code auth.application.LoginService} (LOS-0505) needs to make the session it
 * issues mean anything: reads the {@code lifeos_session} cookie, and — only when it names an active
 * {@link Session} — authenticates the request with the session's {@code userId} as the principal,
 * matching {@code 06-SECURITY.md}'s "Repositories/services require authenticated userId;
 * controllers do not accept a user ID for ownership" (a later controller reads it via
 * {@code @AuthenticationPrincipal UUID}, never a request parameter).
 *
 * <p>Registered with {@code HttpSecurity.addFilterBefore(..., AuthorizationFilter.class)} in {@link
 * ApiSecurityConfiguration} rather than as a bare {@code @Component}: it must run inside Spring
 * Security's own filter chain, after the context is loaded but before the authorization decision,
 * or a plain servlet-container-ordered filter could have its {@link SecurityContextHolder} write
 * silently overwritten by Security's own context-loading step.
 *
 * <p>Deliberately does nothing when a cookie is missing, unknown, expired, or revoked — it leaves
 * the request unauthenticated rather than rejecting it itself, so the existing {@code
 * authenticationEntryPoint} in {@link ApiSecurityConfiguration} is what actually produces the
 * generic 401 for a route that turns out to require authentication.
 */
class SessionAuthenticationFilter extends OncePerRequestFilter {

  static final String SESSION_COOKIE_NAME = "lifeos_session";

  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;

  SessionAuthenticationFilter(
      SessionRepository sessionRepository, SecureTokenGenerator tokenGenerator, Clock clock) {
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    sessionCookieValue(request)
        .map(tokenGenerator::hash)
        .flatMap(sessionRepository::findByTokenHash)
        .filter(session -> session.isActive(clock.instant()))
        .ifPresent(
            session ->
                SecurityContextHolder.getContext()
                    .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                            session.userId(), null, List.of())));
    filterChain.doFilter(request, response);
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
}

package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;
import tech.buildwithpartha.lifeos.common.ratelimit.ClientIpResolver;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimitPolicy;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimitResult;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimiterService;

/**
 * Handler interceptor enforcing per-IP and per-account rate limits across search, export, and
 * write-burst endpoints.
 */
@Component
public class RateLimitingInterceptor implements HandlerInterceptor {

  private final RateLimiterService rateLimiterService;
  private final ClientIpResolver clientIpResolver;

  public RateLimitingInterceptor(
      RateLimiterService rateLimiterService, ClientIpResolver clientIpResolver) {
    this.rateLimiterService = rateLimiterService;
    this.clientIpResolver = clientIpResolver;
  }

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    String uri = request.getRequestURI();

    // Skip auth endpoints as auth services execute fine-grained auth rate limits directly
    if (uri.contains("/auth/")) {
      return true;
    }

    Optional<RateLimitPolicy> policyOpt = resolvePolicy(request, uri);
    if (policyOpt.isEmpty()) {
      return true;
    }

    RateLimitPolicy policy = policyOpt.get();
    String clientIp = clientIpResolver.resolveClientIp(request);
    Optional<String> userIdOpt = getAuthenticatedUserId();

    String key =
        userIdOpt
            .map(userId -> policy.category().label() + ":account:" + userId)
            .orElseGet(() -> policy.category().label() + ":ip:" + clientIp);

    RateLimitResult result = rateLimiterService.tryAcquire(key, policy);
    if (!result.allowed()) {
      throw new RateLimitedException(
          policy.category().label() + " rate limit exceeded", result.retryAfter());
    }

    return true;
  }

  private Optional<RateLimitPolicy> resolvePolicy(HttpServletRequest request, String uri) {
    if (uri.contains("/search")) {
      return Optional.of(RateLimitPolicy.searchPolicy());
    }
    if (uri.contains("/export") || uri.contains("/reports/export")) {
      return Optional.of(RateLimitPolicy.exportPolicy());
    }
    String method = request.getMethod();
    if ("POST".equalsIgnoreCase(method)
        || "PUT".equalsIgnoreCase(method)
        || "PATCH".equalsIgnoreCase(method)
        || "DELETE".equalsIgnoreCase(method)) {
      return Optional.of(RateLimitPolicy.writePolicy());
    }
    return Optional.empty();
  }

  private Optional<String> getAuthenticatedUserId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
      return Optional.empty();
    }
    Object principal = auth.getPrincipal();
    if (principal == null || "anonymousUser".equals(principal)) {
      return Optional.empty();
    }
    return Optional.of(principal.toString());
  }
}

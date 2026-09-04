package tech.buildwithpartha.lifeos.common.cache;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Servlet filter ensuring explicit HTTP cache protection, proxy-bypass, and privacy headers across
 * all backend API responses.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ApiCachePolicyFilter extends OncePerRequestFilter {

  public static final String DEFAULT_CACHE_CONTROL =
      "private, no-cache, max-age=0, must-revalidate";
  public static final String DEFAULT_PRAGMA = "no-cache";
  public static final String DEFAULT_EXPIRES = "0";
  public static final String DEFAULT_VARY = "Accept-Encoding, Cookie, Authorization";
  public static final String DEFAULT_CDN_CACHE_CONTROL = "no-store";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String uri = request.getRequestURI();
    if (isApiRequest(uri)) {
      if (!response.containsHeader("Cache-Control")) {
        response.setHeader("Cache-Control", DEFAULT_CACHE_CONTROL);
      }
      if (!response.containsHeader("Pragma")) {
        response.setHeader("Pragma", DEFAULT_PRAGMA);
      }
      if (!response.containsHeader("Expires")) {
        response.setHeader("Expires", DEFAULT_EXPIRES);
      }
      if (!response.containsHeader("Vary")) {
        response.setHeader("Vary", DEFAULT_VARY);
      }
      if (!response.containsHeader("CDN-Cache-Control")) {
        response.setHeader("CDN-Cache-Control", DEFAULT_CDN_CACHE_CONTROL);
      }
      if (!response.containsHeader("Cloudflare-CDN-Cache-Control")) {
        response.setHeader("Cloudflare-CDN-Cache-Control", DEFAULT_CDN_CACHE_CONTROL);
      }
    }

    filterChain.doFilter(request, response);
  }

  private boolean isApiRequest(String uri) {
    if (uri == null || uri.isBlank()) {
      return false;
    }
    if (uri.startsWith("/actuator/")) {
      return false;
    }
    if (uri.endsWith(".html")
        || uri.endsWith(".css")
        || uri.endsWith(".js")
        || uri.endsWith(".png")
        || uri.endsWith(".jpg")
        || uri.endsWith(".ico")
        || uri.endsWith(".svg")
        || uri.endsWith(".woff2")) {
      return false;
    }
    return true;
  }
}

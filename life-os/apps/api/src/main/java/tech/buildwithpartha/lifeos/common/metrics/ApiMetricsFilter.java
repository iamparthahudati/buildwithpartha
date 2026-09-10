package tech.buildwithpartha.lifeos.common.metrics;

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
 * Filter recording HTTP API request volume and duration metrics with privacy-safe, low-cardinality
 * status class and route tags.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class ApiMetricsFilter extends OncePerRequestFilter {

  private final MetricsService metricsService;

  public ApiMetricsFilter(MetricsService metricsService) {
    this.metricsService = metricsService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    long startTime = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - startTime;
      String uri = request.getRequestURI();
      if (isApiRequest(uri)) {
        String method = request.getMethod();
        String statusClass = getStatusClass(response.getStatus());
        String uriTemplate = normalizeUri(uri);
        metricsService.recordApiRequest(method, statusClass, uriTemplate);
        metricsService.recordApiRequestDuration(method, statusClass, uriTemplate, duration);
      }
    }
  }

  private boolean isApiRequest(String uri) {
    if (uri == null || uri.isBlank()) {
      return false;
    }
    return !uri.startsWith("/actuator/");
  }

  private String getStatusClass(int status) {
    if (status >= 200 && status < 300) {
      return "2xx";
    } else if (status >= 300 && status < 400) {
      return "3xx";
    } else if (status >= 400 && status < 500) {
      return "4xx";
    } else if (status >= 500) {
      return "5xx";
    }
    return "other";
  }

  private String normalizeUri(String uri) {
    // Strip trailing slashes and generalize UUIDs/numeric IDs to preserve low cardinality
    String clean = uri.replaceAll("/[0-9a-fA-F-]{36}", "/{id}").replaceAll("/[0-9]+", "/{id}");
    return clean.isEmpty() ? "/" : clean;
  }
}

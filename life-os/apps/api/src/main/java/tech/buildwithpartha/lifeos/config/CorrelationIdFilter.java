package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Assigns one safe correlation identifier to every API request and response. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public final class CorrelationIdFilter extends OncePerRequestFilter {

  public static final String HEADER_NAME = "X-Correlation-ID";
  static final String REQUEST_ATTRIBUTE = CorrelationIdFilter.class.getName() + ".correlationId";

  private static final Pattern SAFE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String correlationId = selectCorrelationId(request.getHeader(HEADER_NAME));
    request.setAttribute(REQUEST_ATTRIBUTE, correlationId);
    response.setHeader(HEADER_NAME, correlationId);

    try (MDC.MDCCloseable ignored = MDC.putCloseable("correlationId", correlationId)) {
      filterChain.doFilter(request, response);
    }
  }

  static String correlationId(HttpServletRequest request) {
    Object correlationId = request.getAttribute(REQUEST_ATTRIBUTE);
    return correlationId instanceof String value ? value : UUID.randomUUID().toString();
  }

  static String selectCorrelationId(String candidate) {
    return candidate != null && SAFE_VALUE.matcher(candidate).matches()
        ? candidate
        : UUID.randomUUID().toString();
  }
}

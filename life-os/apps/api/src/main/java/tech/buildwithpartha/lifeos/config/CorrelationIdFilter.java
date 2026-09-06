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

/** Assigns safe correlation and tracing identifiers to every API request and response. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public final class CorrelationIdFilter extends OncePerRequestFilter {

  public static final String HEADER_NAME = "X-Correlation-ID";
  public static final String TRACEPARENT_HEADER = "traceparent";
  public static final String TRACE_ID_HEADER = "X-Trace-ID";
  public static final String SPAN_ID_HEADER = "X-Span-ID";

  static final String REQUEST_ATTRIBUTE = CorrelationIdFilter.class.getName() + ".correlationId";

  private static final Pattern SAFE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");
  private static final Pattern TRACEPARENT_PATTERN =
      Pattern.compile("^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$");

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String correlationId = selectCorrelationId(request.getHeader(HEADER_NAME));
    request.setAttribute(REQUEST_ATTRIBUTE, correlationId);
    response.setHeader(HEADER_NAME, correlationId);

    String traceId = null;
    String spanId = null;

    String traceparent = request.getHeader(TRACEPARENT_HEADER);
    if (traceparent != null) {
      var matcher = TRACEPARENT_PATTERN.matcher(traceparent.trim().toLowerCase());
      if (matcher.matches()) {
        traceId = matcher.group(1);
        spanId = matcher.group(2);
      }
    }

    if (traceId == null) {
      String customTraceId = request.getHeader(TRACE_ID_HEADER);
      if (customTraceId != null && SAFE_VALUE.matcher(customTraceId).matches()) {
        traceId = customTraceId;
      }
    }
    if (spanId == null) {
      String customSpanId = request.getHeader(SPAN_ID_HEADER);
      if (customSpanId != null && SAFE_VALUE.matcher(customSpanId).matches()) {
        spanId = customSpanId;
      }
    }

    try (MDC.MDCCloseable cId = MDC.putCloseable("correlationId", correlationId)) {
      if (traceId != null) {
        MDC.put("traceId", traceId);
      }
      if (spanId != null) {
        MDC.put("spanId", spanId);
      }
      try {
        filterChain.doFilter(request, response);
      } finally {
        if (traceId != null) {
          MDC.remove("traceId");
        }
        if (spanId != null) {
          MDC.remove("spanId");
        }
      }
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

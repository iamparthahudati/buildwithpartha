package tech.buildwithpartha.lifeos.common.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tech.buildwithpartha.lifeos.config.CorrelationIdFilter;

class StructuredLoggingTests {

  private final StructuredJsonLayout layout = new StructuredJsonLayout();

  @Test
  @DisplayName("StructuredJsonLayout outputs valid single-line JSON with MDC properties")
  void layoutFormatsLogEventAsJson() {
    ILoggingEvent event = mock(ILoggingEvent.class);
    when(event.getTimeStamp()).thenReturn(1700000000000L);
    when(event.getLevel()).thenReturn(Level.INFO);
    when(event.getThreadName()).thenReturn("main-thread");
    when(event.getLoggerName()).thenReturn("tech.buildwithpartha.lifeos.TestLogger");
    when(event.getFormattedMessage()).thenReturn("User performed action");

    Map<String, String> mdc = new HashMap<>();
    mdc.put("correlationId", "req-correlation-99");
    mdc.put("traceId", "4bf92f3577b34da6a3ce929d0e0e4736");
    mdc.put("spanId", "00f067aa0ba902b7");
    mdc.put("jobKind", "RECURRENCE_GENERATION");
    when(event.getMDCPropertyMap()).thenReturn(mdc);

    String jsonOutput = layout.doLayout(event);

    assertThat(jsonOutput).endsWith("\n");
    assertThat(jsonOutput).contains("\"level\":\"INFO\"");
    assertThat(jsonOutput).contains("\"thread\":\"main-thread\"");
    assertThat(jsonOutput).contains("\"logger\":\"tech.buildwithpartha.lifeos.TestLogger\"");
    assertThat(jsonOutput).contains("\"message\":\"User performed action\"");
    assertThat(jsonOutput).contains("\"correlationId\":\"req-correlation-99\"");
    assertThat(jsonOutput).contains("\"traceId\":\"4bf92f3577b34da6a3ce929d0e0e4736\"");
    assertThat(jsonOutput).contains("\"spanId\":\"00f067aa0ba902b7\"");
    assertThat(jsonOutput).contains("\"jobKind\":\"RECURRENCE_GENERATION\"");
  }

  @Test
  @DisplayName("StructuredJsonLayout includes exception info when throwable is present")
  void layoutIncludesExceptionDetails() {
    ILoggingEvent event = mock(ILoggingEvent.class);
    when(event.getTimeStamp()).thenReturn(1700000000000L);
    when(event.getLevel()).thenReturn(Level.ERROR);
    when(event.getThreadName()).thenReturn("worker-1");
    when(event.getLoggerName()).thenReturn("tech.buildwithpartha.lifeos.ErrorLogger");
    when(event.getFormattedMessage()).thenReturn("Operation failed");

    IThrowableProxy throwable = mock(IThrowableProxy.class);
    when(throwable.getClassName()).thenReturn("java.lang.IllegalArgumentException");
    when(throwable.getMessage()).thenReturn("Invalid parameter value");
    when(event.getThrowableProxy()).thenReturn(throwable);

    String jsonOutput = layout.doLayout(event);

    assertThat(jsonOutput).contains("\"exception\":{");
    assertThat(jsonOutput).contains("\"class\":\"java.lang.IllegalArgumentException\"");
    assertThat(jsonOutput).contains("\"message\":\"Invalid parameter value\"");
  }

  @Test
  @DisplayName("CorrelationIdFilter extracts W3C traceparent header into MDC traceId and spanId")
  void correlationIdFilterExtractsTraceparent() throws Exception {
    CorrelationIdFilter filter = new CorrelationIdFilter();
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/life-os/api/v1/projects");
    request.addHeader("traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    request.addHeader("X-Correlation-ID", "corr-test-123");

    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain filterChain =
        new MockFilterChain() {
          @Override
          public void doFilter(
              jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
              throws IOException, jakarta.servlet.ServletException {
            assertThat(MDC.get("correlationId")).isEqualTo("corr-test-123");
            assertThat(MDC.get("traceId")).isEqualTo("4bf92f3577b34da6a3ce929d0e0e4736");
            assertThat(MDC.get("spanId")).isEqualTo("00f067aa0ba902b7");
            super.doFilter(req, res);
          }
        };

    filter.doFilter(request, response, filterChain);

    // After request completion, MDC should be cleaned up
    assertThat(MDC.get("correlationId")).isNull();
    assertThat(MDC.get("traceId")).isNull();
    assertThat(MDC.get("spanId")).isNull();
  }

  @Test
  @DisplayName("JobCorrelationContext sets and clears job correlation in MDC")
  void jobCorrelationContextSetsAndClearsMdc() {
    UUID jobId = UUID.randomUUID();
    try (var ignored = JobCorrelationContext.withJobCorrelation(jobId, "DATA_EXPORT")) {
      assertThat(MDC.get("correlationId")).isEqualTo("job-" + jobId);
      assertThat(MDC.get("jobKind")).isEqualTo("DATA_EXPORT");
    } finally {
      JobCorrelationContext.clearJobContext();
    }

    assertThat(MDC.get("correlationId")).isNull();
    assertThat(MDC.get("jobKind")).isNull();
  }

  @Test
  @DisplayName("Redaction verification ensures sensitive tokens and credentials are not in MDC")
  void sensitiveValuesNotExposedInMdc() {
    String unsafeCorrelation = "token_secret_123_with_spaces unsafe";
    String safeCorrelation = JobCorrelationContext.sanitizeOrDefault(unsafeCorrelation);

    assertThat(safeCorrelation)
        .isNotEqualTo(unsafeCorrelation)
        .doesNotContain("secret")
        .doesNotContain(" ");

    assertThat(MDC.get("password")).isNull();
    assertThat(MDC.get("token")).isNull();
  }
}

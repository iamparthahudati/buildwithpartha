package tech.buildwithpartha.lifeos.common.logging;

import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;

/** Reusable helper for correlation ID and MDC context management during async and job execution. */
public final class JobCorrelationContext {

  private static final Pattern SAFE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

  private JobCorrelationContext() {}

  /** Sets correlationId in SLF4J MDC and returns an AutoCloseable to clean up MDC. */
  public static MDC.MDCCloseable withCorrelationId(String candidate) {
    String correlationId = sanitizeOrDefault(candidate);
    return MDC.putCloseable("correlationId", correlationId);
  }

  /** Sets job-specific correlationId and jobKind in SLF4J MDC. */
  public static MDC.MDCCloseable withJobCorrelation(UUID jobId, Object jobKind) {
    String correlationId =
        "job-" + (jobId != null ? jobId.toString() : UUID.randomUUID().toString());
    MDC.put("jobKind", jobKind != null ? jobKind.toString() : "unknown");
    return MDC.putCloseable("correlationId", correlationId);
  }

  /** Clears jobContext from MDC after execution. */
  public static void clearJobContext() {
    MDC.remove("jobKind");
    MDC.remove("correlationId");
    MDC.remove("traceId");
    MDC.remove("spanId");
  }

  public static String sanitizeOrDefault(String candidate) {
    return candidate != null && SAFE_VALUE.matcher(candidate).matches()
        ? candidate
        : UUID.randomUUID().toString();
  }
}

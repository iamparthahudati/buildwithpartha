package tech.buildwithpartha.lifeos.common.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import ch.qos.logback.core.LayoutBase;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/** Logback layout formatting log events as structured single-line JSON objects. */
public class StructuredJsonLayout extends LayoutBase<ILoggingEvent> {

  private static final DateTimeFormatter ISO_FORMATTER =
      DateTimeFormatter.ISO_INSTANT.withZone(ZoneOffset.UTC);

  @Override
  public String doLayout(ILoggingEvent event) {
    if (event == null) {
      return "";
    }

    StringBuilder sb = new StringBuilder(256);
    sb.append("{");

    // Timestamp
    sb.append("\"timestamp\":");
    appendJsonString(sb, ISO_FORMATTER.format(Instant.ofEpochMilli(event.getTimeStamp())));

    // Level
    sb.append(",\"level\":");
    appendJsonString(sb, event.getLevel() != null ? event.getLevel().toString() : "INFO");

    // Thread
    sb.append(",\"thread\":");
    appendJsonString(sb, event.getThreadName());

    // Logger
    sb.append(",\"logger\":");
    appendJsonString(sb, event.getLoggerName());

    // Message
    sb.append(",\"message\":");
    appendJsonString(sb, event.getFormattedMessage());

    // MDC properties (correlationId, traceId, spanId)
    Map<String, String> mdc = event.getMDCPropertyMap();
    if (mdc != null && !mdc.isEmpty()) {
      String correlationId = mdc.get("correlationId");
      if (correlationId != null && !correlationId.isBlank()) {
        sb.append(",\"correlationId\":");
        appendJsonString(sb, correlationId);
      }
      String traceId = mdc.get("traceId");
      if (traceId != null && !traceId.isBlank()) {
        sb.append(",\"traceId\":");
        appendJsonString(sb, traceId);
      }
      String spanId = mdc.get("spanId");
      if (spanId != null && !spanId.isBlank()) {
        sb.append(",\"spanId\":");
        appendJsonString(sb, spanId);
      }
      String jobKind = mdc.get("jobKind");
      if (jobKind != null && !jobKind.isBlank()) {
        sb.append(",\"jobKind\":");
        appendJsonString(sb, jobKind);
      }
    }

    // Exception / Stack trace if present
    IThrowableProxy throwable = event.getThrowableProxy();
    if (throwable != null) {
      sb.append(",\"exception\":{");
      sb.append("\"class\":");
      appendJsonString(sb, throwable.getClassName());
      sb.append(",\"message\":");
      appendJsonString(sb, throwable.getMessage());
      StackTraceElementProxy[] stackTrace = throwable.getStackTraceElementProxyArray();
      if (stackTrace != null && stackTrace.length > 0) {
        sb.append(",\"stackTrace\":[");
        int limit = Math.min(stackTrace.length, 10);
        for (int i = 0; i < limit; i++) {
          if (i > 0) {
            sb.append(",");
          }
          appendJsonString(sb, stackTrace[i].toString());
        }
        sb.append("]");
      }
      sb.append("}");
    }

    sb.append("}\n");
    return sb.toString();
  }

  static void appendJsonString(StringBuilder sb, String value) {
    if (value == null) {
      sb.append("null");
      return;
    }
    sb.append('"');
    for (int i = 0; i < value.length(); i++) {
      char c = value.charAt(i);
      switch (c) {
        case '"':
          sb.append("\\\"");
          break;
        case '\\':
          sb.append("\\\\");
          break;
        case '\b':
          sb.append("\\b");
          break;
        case '\f':
          sb.append("\\f");
          break;
        case '\n':
          sb.append("\\n");
          break;
        case '\r':
          sb.append("\\r");
          break;
        case '\t':
          sb.append("\\t");
          break;
        default:
          if (c < ' ') {
            sb.append(String.format("\\u%04x", (int) c));
          } else {
            sb.append(c);
          }
      }
    }
    sb.append('"');
  }
}

package tech.buildwithpartha.lifeos.audit.application;

import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;

/** Selects only the allowlisted request correlation identifier for event persistence. */
final class EventCorrelationIds {

  private static final Pattern SAFE_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

  private EventCorrelationIds() {}

  static String current() {
    String candidate = MDC.get("correlationId");
    return candidate != null && SAFE_VALUE.matcher(candidate).matches()
        ? candidate
        : UUID.randomUUID().toString();
  }
}

package tech.buildwithpartha.lifeos.common.mail;

import java.util.Map;
import java.util.Objects;

/**
 * Render-time substitution values for a mail template.
 *
 * <p>These may include a single-use verification/reset URL or token, so {@link #toString()} is
 * deliberately redacted, mirroring {@code auth.domain.RawPassword}: logging, assertion failures, or
 * an exception message that includes this object can never reveal a raw secret. Callers must still
 * avoid logging {@link #asMap()} itself directly.
 */
public final class MailTemplateVariables {

  private static final MailTemplateVariables EMPTY = new MailTemplateVariables(Map.of());

  private final Map<String, String> values;

  private MailTemplateVariables(Map<String, String> values) {
    this.values = values;
  }

  public static MailTemplateVariables of(Map<String, String> values) {
    Objects.requireNonNull(values, "values must not be null");
    return new MailTemplateVariables(Map.copyOf(values));
  }

  public static MailTemplateVariables empty() {
    return EMPTY;
  }

  public Map<String, String> asMap() {
    return values;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof MailTemplateVariables that)) {
      return false;
    }
    return values.equals(that.values);
  }

  @Override
  public int hashCode() {
    return values.hashCode();
  }

  @Override
  public String toString() {
    return "MailTemplateVariables[REDACTED, " + values.size() + " entries]";
  }
}

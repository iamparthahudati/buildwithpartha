package tech.buildwithpartha.lifeos.notification.domain;

/**
 * A {@link MailTemplateRenderer} could not produce a {@link RenderedMailMessage} — for example a
 * template referenced a placeholder with no corresponding variable. Thrown rather than silently
 * sending mail with a literal {@code {{placeholder}}} left in it.
 */
public class MailTemplateRenderException extends RuntimeException {

  public MailTemplateRenderException(String message) {
    super(message);
  }

  public MailTemplateRenderException(String message, Throwable cause) {
    super(message, cause);
  }
}

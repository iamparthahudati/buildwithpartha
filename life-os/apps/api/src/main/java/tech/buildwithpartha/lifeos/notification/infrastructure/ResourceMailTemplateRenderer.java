package tech.buildwithpartha.lifeos.notification.infrastructure;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.MailTemplateRenderException;
import tech.buildwithpartha.lifeos.notification.domain.MailTemplateRenderer;
import tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage;

/**
 * Renders the bundled plain-text templates under {@code
 * src/main/resources/notification/templates/<kind>/{subject,body}.txt} via {@code {{var}}}
 * substitution, mirroring {@code auth.infrastructure.WordlistCommonPasswordChecker}'s
 * bundled-resource loading pattern. Plain text (not HTML) sidesteps needing to HTML-escape
 * substituted values. Real copy/variable names belong to the caller (LOS-0503/LOS-0507); this
 * renderer is generic.
 */
@Component
class ResourceMailTemplateRenderer implements MailTemplateRenderer {

  private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*}}");

  private final Map<MailMessageKind, LoadedTemplate> templates;

  ResourceMailTemplateRenderer() {
    this.templates =
        Arrays.stream(MailMessageKind.values())
            .collect(
                Collectors.toUnmodifiableMap(
                    kind -> kind, ResourceMailTemplateRenderer::loadTemplate));
  }

  @Override
  public RenderedMailMessage render(MailMessageKind kind, MailTemplateVariables variables) {
    LoadedTemplate template = templates.get(kind);
    String subject = substitute(template.subject(), variables.asMap(), kind);
    String body = substitute(template.body(), variables.asMap(), kind);
    return new RenderedMailMessage(subject, body);
  }

  private static String substitute(
      String text, Map<String, String> variables, MailMessageKind kind) {
    Matcher matcher = PLACEHOLDER.matcher(text);
    StringBuilder result = new StringBuilder();
    while (matcher.find()) {
      String key = matcher.group(1);
      String value = variables.get(key);
      if (value == null) {
        throw new MailTemplateRenderException(
            "Missing template variable '" + key + "' for " + kind);
      }
      matcher.appendReplacement(result, Matcher.quoteReplacement(value));
    }
    matcher.appendTail(result);
    return result.toString();
  }

  private static LoadedTemplate loadTemplate(MailMessageKind kind) {
    String directory = directoryFor(kind);
    return new LoadedTemplate(
        readResource(directory + "/subject.txt"), readResource(directory + "/body.txt"));
  }

  private static String directoryFor(MailMessageKind kind) {
    return switch (kind) {
      case EMAIL_VERIFICATION -> "email-verification";
      case PASSWORD_RESET -> "password-reset";
      case SECURITY_ALERT -> "security-alert";
    };
  }

  private static String readResource(String relativePath) {
    String fullPath = "notification/templates/" + relativePath;
    ClassPathResource resource = new ClassPathResource(fullPath);
    try (InputStream input = resource.getInputStream()) {
      return new String(input.readAllBytes(), StandardCharsets.UTF_8).strip();
    } catch (IOException e) {
      throw new UncheckedIOException("Unable to load " + fullPath, e);
    }
  }

  private record LoadedTemplate(String subject, String body) {}
}

package tech.buildwithpartha.lifeos.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.common.mail.MailTemplateVariables;
import tech.buildwithpartha.lifeos.notification.domain.MailTemplateRenderException;
import tech.buildwithpartha.lifeos.notification.domain.RenderedMailMessage;

class ResourceMailTemplateRendererTests {

  private final ResourceMailTemplateRenderer renderer = new ResourceMailTemplateRenderer();

  @Test
  void rendersTheEmailVerificationTemplate() {
    RenderedMailMessage rendered =
        renderer.render(
            MailMessageKind.EMAIL_VERIFICATION,
            MailTemplateVariables.of(
                Map.of(
                    "displayName", "Ada",
                    "verificationUrl", "https://lifeos.example.test/verify/abc",
                    "expiresInMinutes", "30")));

    assertThat(rendered.subject()).isNotBlank();
    assertThat(rendered.body())
        .contains("Ada")
        .contains("https://lifeos.example.test/verify/abc")
        .contains("30")
        .doesNotContain("{{");
  }

  @Test
  void rendersThePasswordResetTemplate() {
    RenderedMailMessage rendered =
        renderer.render(
            MailMessageKind.PASSWORD_RESET,
            MailTemplateVariables.of(
                Map.of(
                    "displayName", "Grace",
                    "resetUrl", "https://lifeos.example.test/reset/xyz",
                    "expiresInMinutes", "15")));

    assertThat(rendered.body()).contains("Grace").contains("https://lifeos.example.test/reset/xyz");
  }

  @Test
  void rendersTheSecurityAlertTemplate() {
    RenderedMailMessage rendered =
        renderer.render(
            MailMessageKind.SECURITY_ALERT,
            MailTemplateVariables.of(
                Map.of(
                    "displayName", "Alan",
                    "eventDescription", "New sign-in from an unrecognized device",
                    "occurredAt", "2026-08-18T00:00:00Z")));

    assertThat(rendered.body())
        .contains("Alan")
        .contains("New sign-in from an unrecognized device");
  }

  @Test
  void throwsWhenAPlaceholderHasNoCorrespondingVariable() {
    assertThatThrownBy(
            () ->
                renderer.render(MailMessageKind.EMAIL_VERIFICATION, MailTemplateVariables.empty()))
        .isInstanceOf(MailTemplateRenderException.class);
  }
}

package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.Cookie;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import tech.buildwithpartha.lifeos.auth.application.SessionBootstrapService;
import tech.buildwithpartha.lifeos.auth.application.SessionManagementService;

class SecurityControllerUnitTests {

  @Test
  @DisplayName("SecurityController handles null and non-matching cookies in HttpServletRequest")
  void testCookieParsingBranches() {
    SessionBootstrapService bootstrapService = mock(SessionBootstrapService.class);
    SessionManagementService sessionManagementService = mock(SessionManagementService.class);

    when(bootstrapService.bootstrap(any(), any())).thenReturn(Optional.empty());

    SecurityController controller =
        new SecurityController(null, sessionManagementService, bootstrapService, null);

    MockHttpServletRequest noCookiesRequest = new MockHttpServletRequest();
    UUID userId = UUID.randomUUID();

    assertThatThrownBy(() -> controller.getSession(userId, noCookiesRequest))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Active session missing");

    MockHttpServletRequest irrelevantCookieRequest = new MockHttpServletRequest();
    irrelevantCookieRequest.setCookies(new Cookie("other_cookie", "value"));

    assertThatThrownBy(() -> controller.getSession(userId, irrelevantCookieRequest))
        .isInstanceOf(IllegalStateException.class);

    controller.listSessions(userId, noCookiesRequest);
    verify(sessionManagementService).listActiveSessions(eq(userId), eq(Optional.empty()));

    controller.revokeAllOtherSessions(userId, noCookiesRequest);
    verify(sessionManagementService).revokeAllOtherSessions(eq(userId), eq(Optional.empty()));
  }
}

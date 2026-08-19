package tech.buildwithpartha.lifeos.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.auth.application.ChangePasswordCommand;
import tech.buildwithpartha.lifeos.auth.application.ChangePasswordService;
import tech.buildwithpartha.lifeos.auth.application.SessionDto;
import tech.buildwithpartha.lifeos.auth.application.SessionManagementService;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/** Authenticated security and session management endpoints (LOS-0516). */
@RestController
@RequestMapping("/auth")
@SecurityRequirement(name = "sessionCookie")
public class SecurityController {

  static final String SESSION_COOKIE_NAME = "lifeos_session";

  private final ChangePasswordService changePasswordService;
  private final SessionManagementService sessionManagementService;

  public SecurityController(
      ChangePasswordService changePasswordService,
      SessionManagementService sessionManagementService) {
    this.changePasswordService = changePasswordService;
    this.sessionManagementService = sessionManagementService;
  }

  @Operation(
      summary = "Change password",
      description =
          "Validates current password, updates to new compliant password, revokes other sessions,"
              + " and preserves current session.")
  @ApiResponse(responseCode = "200", description = "Password changed successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/change-password")
  public ChangePasswordResponse changePassword(
      @AuthenticationPrincipal UUID userId,
      @Valid @RequestBody ChangePasswordRequest request,
      HttpServletRequest servletRequest) {
    changePasswordService.changePassword(
        new ChangePasswordCommand(
            userId,
            RawPassword.of(request.currentPassword()),
            RawPassword.of(request.newPassword()),
            sessionCookieValue(servletRequest)));
    return ChangePasswordResponse.success();
  }

  @Operation(
      summary = "List active sessions",
      description = "Retrieves active sessions for the current account.")
  @ApiResponse(responseCode = "200", description = "Active session list.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/sessions")
  public SessionListResponse listSessions(
      @AuthenticationPrincipal UUID userId, HttpServletRequest servletRequest) {
    List<SessionDto> sessions =
        sessionManagementService.listActiveSessions(userId, sessionCookieValue(servletRequest));
    return SessionListResponse.of(sessions.stream().map(SessionResponse::from).toList());
  }

  @Operation(
      summary = "Revoke session",
      description = "Revokes an active session by its ID.")
  @ApiResponse(responseCode = "200", description = "Session revoked.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/sessions/{sessionId}")
  public ResponseEntity<RevokeSessionResponse> revokeSession(
      @AuthenticationPrincipal UUID userId, @PathVariable("sessionId") UUID sessionId) {
    boolean revoked = sessionManagementService.revokeSession(userId, sessionId);
    return ResponseEntity.ok(new RevokeSessionResponse(revoked));
  }

  @Operation(
      summary = "Revoke all other sessions",
      description = "Revokes every active session for this account except the current one.")
  @ApiResponse(responseCode = "200", description = "All other sessions revoked.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/sessions/revoke-others")
  public RevokeAllOtherSessionsResponse revokeAllOtherSessions(
      @AuthenticationPrincipal UUID userId, HttpServletRequest servletRequest) {
    int count =
        sessionManagementService.revokeAllOtherSessions(userId, sessionCookieValue(servletRequest));
    return RevokeAllOtherSessionsResponse.of(count);
  }

  private static Optional<String> sessionCookieValue(HttpServletRequest servletRequest) {
    Cookie[] cookies = servletRequest.getCookies();
    if (cookies == null) {
      return Optional.empty();
    }
    return Arrays.stream(cookies)
        .filter(cookie -> SESSION_COOKIE_NAME.equals(cookie.getName()))
        .map(Cookie::getValue)
        .findFirst();
  }
}

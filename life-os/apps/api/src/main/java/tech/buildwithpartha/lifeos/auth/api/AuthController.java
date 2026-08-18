package tech.buildwithpartha.lifeos.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.auth.application.EmailVerificationService;
import tech.buildwithpartha.lifeos.auth.application.ForgotPasswordCommand;
import tech.buildwithpartha.lifeos.auth.application.ForgotPasswordService;
import tech.buildwithpartha.lifeos.auth.application.LoginCommand;
import tech.buildwithpartha.lifeos.auth.application.LoginResult;
import tech.buildwithpartha.lifeos.auth.application.LoginService;
import tech.buildwithpartha.lifeos.auth.application.LogoutCommand;
import tech.buildwithpartha.lifeos.auth.application.LogoutService;
import tech.buildwithpartha.lifeos.auth.application.ResetPasswordCommand;
import tech.buildwithpartha.lifeos.auth.application.ResetPasswordService;
import tech.buildwithpartha.lifeos.auth.application.SignupCommand;
import tech.buildwithpartha.lifeos.auth.application.SignupService;
import tech.buildwithpartha.lifeos.auth.application.VerifyEmailCommand;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.config.LifeOsEnvironmentProperties;

/** Unauthenticated identity endpoints. */
@RestController
@RequestMapping("/auth")
public class AuthController {

  static final String SESSION_COOKIE_NAME = "lifeos_session";
  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";
  private static final int MAX_DEVICE_HINT_LENGTH = 255;

  private final SignupService signupService;
  private final EmailVerificationService emailVerificationService;
  private final LoginService loginService;
  private final LogoutService logoutService;
  private final ForgotPasswordService forgotPasswordService;
  private final ResetPasswordService resetPasswordService;
  private final LifeOsEnvironmentProperties environmentProperties;

  public AuthController(
      SignupService signupService,
      EmailVerificationService emailVerificationService,
      LoginService loginService,
      LogoutService logoutService,
      ForgotPasswordService forgotPasswordService,
      ResetPasswordService resetPasswordService,
      LifeOsEnvironmentProperties environmentProperties) {
    this.signupService = signupService;
    this.emailVerificationService = emailVerificationService;
    this.loginService = loginService;
    this.logoutService = logoutService;
    this.forgotPasswordService = forgotPasswordService;
    this.resetPasswordService = resetPasswordService;
    this.environmentProperties = environmentProperties;
  }

  @Operation(
      summary = "Create an account",
      description =
          "Creates an unverified account and enqueues a verification email. The response is the"
              + " same whether or not the email already belongs to an account.")
  @SecurityRequirements
  @ApiResponse(responseCode = "202", description = "The request was accepted.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "429", ref = "#/components/responses/TooManyRequests")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/signup")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public SignupResponse signup(
      @Valid @RequestBody SignupRequest request, HttpServletRequest servletRequest) {
    signupService.signup(
        new SignupCommand(
            request.email(),
            RawPassword.of(request.password()),
            request.displayName(),
            request.termsVersion(),
            request.privacyVersion(),
            servletRequest.getRemoteAddr()));
    return SignupResponse.pendingVerification();
  }

  @Operation(
      summary = "Verify an email address",
      description =
          "Consumes a single-use email verification token and activates the account it belongs"
              + " to.")
  @SecurityRequirements
  @ApiResponse(responseCode = "200", description = "The account was verified.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/verify-email")
  public VerifyEmailResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
    emailVerificationService.verify(new VerifyEmailCommand(request.token()));
    return VerifyEmailResponse.verified();
  }

  @Operation(
      summary = "Log in",
      description =
          "Authenticates a verified, active account and issues a fresh session. Every rejection"
              + " reason reports the same generic invalid-credentials failure.")
  @SecurityRequirements
  @ApiResponse(responseCode = "200", description = "A new session was issued.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "429", ref = "#/components/responses/TooManyRequests")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
    LoginResult result =
        loginService.login(
            new LoginCommand(
                request.email(),
                RawPassword.of(request.password()),
                servletRequest.getRemoteAddr(),
                deviceHint(servletRequest)));
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, sessionCookie(result.sessionToken().value()).toString())
        .body(LoginResponse.of(result.user(), result.csrfToken().value()));
  }

  @Operation(
      summary = "Log out",
      description =
          "Revokes the current session and clears the session cookie. Safe to call with no"
              + " active session at all.")
  @SecurityRequirements
  @ApiResponse(responseCode = "200", description = "The current session is no longer valid.")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/logout")
  public ResponseEntity<LogoutResponse> logout(HttpServletRequest servletRequest) {
    logoutService.logout(logoutCommand(servletRequest));
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, clearedSessionCookie().toString())
        .body(LogoutResponse.loggedOut());
  }

  @Operation(
      summary = "Log out everywhere",
      description =
          "Revokes every session belonging to the current account, including this one, and"
              + " clears the session cookie. Safe to call with no active session at all.")
  @SecurityRequirements
  @ApiResponse(responseCode = "200", description = "No session for this account remains valid.")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/logout-all")
  public ResponseEntity<LogoutResponse> logoutAll(HttpServletRequest servletRequest) {
    logoutService.logoutAll(logoutCommand(servletRequest));
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, clearedSessionCookie().toString())
        .body(LogoutResponse.loggedOut());
  }

  @Operation(
      summary = "Request a password reset",
      description =
          "Enqueues a reset email when the address belongs to an active account. The response is"
              + " the same whether or not it does.")
  @SecurityRequirements
  @ApiResponse(responseCode = "202", description = "The request was accepted.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "429", ref = "#/components/responses/TooManyRequests")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/forgot-password")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public ForgotPasswordResponse forgotPassword(
      @Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest servletRequest) {
    forgotPasswordService.request(
        new ForgotPasswordCommand(request.email(), servletRequest.getRemoteAddr()));
    return ForgotPasswordResponse.requested();
  }

  @Operation(
      summary = "Reset a password",
      description =
          "Consumes a single-use password reset token, sets a new password, and revokes every"
              + " session for the account.")
  @SecurityRequirements
  @ApiResponse(responseCode = "200", description = "The password was reset.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/reset-password")
  public ResetPasswordResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
    resetPasswordService.reset(
        new ResetPasswordCommand(request.token(), RawPassword.of(request.newPassword())));
    return ResetPasswordResponse.passwordReset();
  }

  private static LogoutCommand logoutCommand(HttpServletRequest servletRequest) {
    return new LogoutCommand(
        sessionCookieValue(servletRequest),
        Optional.ofNullable(servletRequest.getHeader(CSRF_HEADER_NAME)));
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

  private ResponseCookie sessionCookie(String rawSessionToken) {
    return ResponseCookie.from(SESSION_COOKIE_NAME, rawSessionToken)
        .httpOnly(true)
        .secure(environmentProperties.sessionCookieSecure())
        .sameSite("Lax")
        .path("/life-os")
        .maxAge(Session.TTL)
        .build();
  }

  private ResponseCookie clearedSessionCookie() {
    return ResponseCookie.from(SESSION_COOKIE_NAME, "")
        .httpOnly(true)
        .secure(environmentProperties.sessionCookieSecure())
        .sameSite("Lax")
        .path("/life-os")
        .maxAge(0)
        .build();
  }

  private static Optional<String> deviceHint(HttpServletRequest servletRequest) {
    String userAgent = servletRequest.getHeader("User-Agent");
    if (userAgent == null || userAgent.isBlank()) {
      return Optional.empty();
    }
    return Optional.of(
        userAgent.length() > MAX_DEVICE_HINT_LENGTH
            ? userAgent.substring(0, MAX_DEVICE_HINT_LENGTH)
            : userAgent);
  }
}

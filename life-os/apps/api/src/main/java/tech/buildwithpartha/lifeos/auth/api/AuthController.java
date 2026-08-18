package tech.buildwithpartha.lifeos.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.auth.application.EmailVerificationService;
import tech.buildwithpartha.lifeos.auth.application.SignupCommand;
import tech.buildwithpartha.lifeos.auth.application.SignupService;
import tech.buildwithpartha.lifeos.auth.application.VerifyEmailCommand;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/** Unauthenticated identity endpoints ({@code /auth/login}, {@code /auth/logout} land later). */
@RestController
@RequestMapping("/auth")
public class AuthController {

  private final SignupService signupService;
  private final EmailVerificationService emailVerificationService;

  public AuthController(
      SignupService signupService, EmailVerificationService emailVerificationService) {
    this.signupService = signupService;
    this.emailVerificationService = emailVerificationService;
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
}

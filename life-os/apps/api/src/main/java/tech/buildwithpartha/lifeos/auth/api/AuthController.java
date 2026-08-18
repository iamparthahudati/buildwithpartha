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
import tech.buildwithpartha.lifeos.auth.application.SignupCommand;
import tech.buildwithpartha.lifeos.auth.application.SignupService;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

/** Unauthenticated identity endpoints ({@code /auth/login}, {@code /auth/logout} land later). */
@RestController
@RequestMapping("/auth")
public class AuthController {

  private final SignupService signupService;

  public AuthController(SignupService signupService) {
    this.signupService = signupService;
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
}

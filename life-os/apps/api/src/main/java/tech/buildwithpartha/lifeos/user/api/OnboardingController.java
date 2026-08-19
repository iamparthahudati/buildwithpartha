package tech.buildwithpartha.lifeos.user.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.user.application.CompleteOnboardingCommand;
import tech.buildwithpartha.lifeos.user.application.OnboardingService;
import tech.buildwithpartha.lifeos.user.application.OnboardingSummary;
import tech.buildwithpartha.lifeos.user.application.UpdatePlanningDefaultsStepCommand;
import tech.buildwithpartha.lifeos.user.application.UpdateTimeAndWeekStepCommand;
import tech.buildwithpartha.lifeos.user.application.UpdateWelcomeStepCommand;

/**
 * Onboarding lifecycle and step persistence endpoints (LOS-0513, 25-ONBOARDING-SPECIFICATION.md).
 */
@RestController
@RequestMapping("/onboarding")
@SecurityRequirement(name = "sessionCookie")
public class OnboardingController {

  private final OnboardingService onboardingService;

  public OnboardingController(OnboardingService onboardingService) {
    this.onboardingService = onboardingService;
  }

  @Operation(
      summary = "Get onboarding status",
      description =
          "Retrieves current onboarding progress, confirmed profile settings, "
              + "and planning defaults.")
  @ApiResponse(responseCode = "200", description = "Current onboarding state.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public OnboardingResponse getOnboarding(@AuthenticationPrincipal UUID userId) {
    OnboardingSummary summary = onboardingService.getOnboarding(userId);
    return OnboardingResponse.fromSummary(summary);
  }

  @Operation(
      summary = "Save welcome and privacy step",
      description = "Confirms display name and advances onboarding progress to Step 1 (Welcome).")
  @ApiResponse(responseCode = "200", description = "Step 1 saved.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/welcome")
  public OnboardingResponse updateWelcome(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody UpdateWelcomeStepRequest request) {
    OnboardingSummary summary =
        onboardingService.updateWelcomeStep(
            userId, new UpdateWelcomeStepCommand(request.displayName()));
    return OnboardingResponse.fromSummary(summary);
  }

  @Operation(
      summary = "Save time and week step",
      description =
          "Validates and confirms IANA timezone, week start, and locale preferences (Step 2).")
  @ApiResponse(responseCode = "200", description = "Step 2 saved.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/time-and-week")
  public OnboardingResponse updateTimeAndWeek(
      @AuthenticationPrincipal UUID userId,
      @Valid @RequestBody UpdateTimeAndWeekStepRequest request) {
    OnboardingSummary summary =
        onboardingService.updateTimeAndWeekStep(
            userId,
            new UpdateTimeAndWeekStepCommand(
                request.timeZone(),
                Optional.ofNullable(request.locale()),
                Optional.ofNullable(request.weekStart())));
    return OnboardingResponse.fromSummary(summary);
  }

  @Operation(
      summary = "Save planning defaults step",
      description =
          "Saves optional working days, work hours, and focus defaults, "
              + "or records an explicit skip (Step 3).")
  @ApiResponse(responseCode = "200", description = "Step 3 saved.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/planning-defaults")
  public OnboardingResponse updatePlanningDefaults(
      @AuthenticationPrincipal UUID userId,
      @Valid @RequestBody UpdatePlanningDefaultsStepRequest request) {
    OnboardingSummary summary =
        onboardingService.updatePlanningDefaultsStep(
            userId,
            new UpdatePlanningDefaultsStepCommand(
                Optional.ofNullable(request.workingDays()),
                Optional.ofNullable(request.workStartTime()).map(LocalTime::parse),
                Optional.ofNullable(request.workEndTime()).map(LocalTime::parse),
                Optional.ofNullable(request.overnightSchedule()),
                Optional.ofNullable(request.dailyFocusTargetMinutes()),
                Optional.ofNullable(request.focusDurationMinutes()),
                Optional.ofNullable(request.breakDurationMinutes()),
                request.skipped()));
    return OnboardingResponse.fromSummary(summary);
  }

  @Operation(
      summary = "Complete onboarding",
      description =
          "Marks onboarding as completed with the current timestamp and version (Step 4).")
  @ApiResponse(responseCode = "200", description = "Onboarding completed.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/complete")
  public OnboardingResponse completeOnboarding(@AuthenticationPrincipal UUID userId) {
    OnboardingSummary summary =
        onboardingService.completeOnboarding(userId, new CompleteOnboardingCommand());
    return OnboardingResponse.fromSummary(summary);
  }
}

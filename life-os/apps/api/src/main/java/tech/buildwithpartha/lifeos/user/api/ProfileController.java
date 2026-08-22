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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.user.application.UpdatePreferencesCommand;
import tech.buildwithpartha.lifeos.user.application.UpdateProfileCommand;
import tech.buildwithpartha.lifeos.user.application.UserProfileService;
import tech.buildwithpartha.lifeos.user.domain.PlanningDefaults;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserProfile;

/** Account profile and preference endpoints (LOS-0513, LOS-0515). */
@RestController
@RequestMapping("/user")
@SecurityRequirement(name = "sessionCookie")
public class ProfileController {

  private final UserProfileService userProfileService;

  public ProfileController(UserProfileService userProfileService) {
    this.userProfileService = userProfileService;
  }

  @Operation(
      summary = "Get user profile",
      description = "Retrieves the current user's profile and localization settings.")
  @ApiResponse(responseCode = "200", description = "Current user profile.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/profile")
  public UserProfileResponse getProfile(@AuthenticationPrincipal UUID userId) {
    UserProfile profile = userProfileService.getProfile(userId);
    return UserProfileResponse.fromDomain(profile);
  }

  @Operation(
      summary = "Update user profile",
      description = "Updates display name, timezone, locale, and week start settings.")
  @ApiResponse(responseCode = "200", description = "Profile updated.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/profile")
  public UserProfileResponse updateProfile(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody UpdateUserProfileRequest request) {
    UserProfile updated =
        userProfileService.updateProfile(
            userId,
            new UpdateProfileCommand(
                request.displayName(), request.timeZone(), request.locale(), request.weekStart()));
    return UserProfileResponse.fromDomain(updated);
  }

  @Operation(
      summary = "Get user preferences",
      description = "Retrieves planning and focus defaults.")
  @ApiResponse(responseCode = "200", description = "Current user preferences.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/preferences")
  public UserPreferencesResponse getPreferences(@AuthenticationPrincipal UUID userId) {
    UserPreferences preferences = userProfileService.getPreferences(userId);
    return UserPreferencesResponse.fromDomain(preferences);
  }

  @Operation(
      summary = "Update user preferences",
      description = "Updates planning defaults, working days, work hours, and focus durations.")
  @ApiResponse(responseCode = "200", description = "Preferences updated.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/preferences")
  public UserPreferencesResponse updatePreferences(
      @AuthenticationPrincipal UUID userId,
      @Valid @RequestBody UpdateUserPreferencesRequest request) {
    PlanningDefaults defaults =
        new PlanningDefaults(
            request.workingDays(),
            Optional.ofNullable(request.workStartTime()).map(LocalTime::parse),
            Optional.ofNullable(request.workEndTime()).map(LocalTime::parse),
            request.overnightSchedule(),
            Optional.ofNullable(request.dailyFocusTargetMinutes()),
            request.focusDurationMinutes(),
            request.breakDurationMinutes());

    UserPreferences updated =
        userProfileService.updatePreferences(userId, new UpdatePreferencesCommand(defaults));
    return UserPreferencesResponse.fromDomain(updated);
  }
}

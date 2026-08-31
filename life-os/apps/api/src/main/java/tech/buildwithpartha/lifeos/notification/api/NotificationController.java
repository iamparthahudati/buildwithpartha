package tech.buildwithpartha.lifeos.notification.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.notification.application.NotificationService;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferences;

/** REST controller exposing user-scoped notification endpoints (LOS-1303). */
@RestController
@RequestMapping("/notifications")
@SecurityRequirement(name = "sessionCookie")
public class NotificationController {

  private final NotificationService notificationService;

  public NotificationController(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  @Operation(
      summary = "List notifications",
      description = "User-scoped list of in-app notifications.")
  @ApiResponse(responseCode = "200", description = "Notifications page.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping
  public PageResponse<NotificationResponse> listNotifications(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "unreadOnly", required = false) Boolean unreadOnly,
      @RequestParam(name = "categories", required = false) Set<String> categoriesParam,
      @RequestParam(name = "category", required = false) String categoryParam,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size) {

    Set<NotificationCategory> categories = parseCategories(categoriesParam, categoryParam);
    PageResponse<Notification> pageResult =
        notificationService.getNotifications(userId, unreadOnly, categories, page, size);

    return new PageResponse<>(
        pageResult.items().stream().map(NotificationResponse::fromDomain).toList(),
        pageResult.page(),
        pageResult.size(),
        pageResult.totalItems(),
        pageResult.totalPages());
  }

  @Operation(
      summary = "Get unread count",
      description = "Returns total count of unread notifications.")
  @ApiResponse(responseCode = "200", description = "Unread count response.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping("/unread-count")
  public NotificationUnreadCountResponse getUnreadCount(@AuthenticationPrincipal UUID userId) {
    long count = notificationService.getUnreadCount(userId);
    return new NotificationUnreadCountResponse(count);
  }

  @Operation(summary = "Mark notification as read")
  @ApiResponse(responseCode = "200", description = "Updated notification.")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @PutMapping("/{id}/read")
  public NotificationResponse markAsRead(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    Notification notification = notificationService.markAsRead(id, userId);
    return NotificationResponse.fromDomain(notification);
  }

  @Operation(summary = "Mark notification as unread")
  @ApiResponse(responseCode = "200", description = "Updated notification.")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @PutMapping("/{id}/unread")
  public NotificationResponse markAsUnread(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    Notification notification = notificationService.markAsUnread(id, userId);
    return NotificationResponse.fromDomain(notification);
  }

  @Operation(summary = "Mark all notifications as read")
  @ApiResponse(responseCode = "200", description = "Marked all as read.")
  @PutMapping("/read-all")
  public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UUID userId) {
    notificationService.markAllAsRead(userId);
    return ResponseEntity.ok().build();
  }

  @Operation(
      summary = "Clear notification",
      description = "Deletes a single clearable notification.")
  @ApiResponse(responseCode = "204", description = "Notification cleared.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> clearNotification(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    notificationService.clearNotification(id, userId);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Clear all notifications",
      description = "Clears all clearable notifications.")
  @ApiResponse(responseCode = "204", description = "Clearable notifications cleared.")
  @DeleteMapping
  public ResponseEntity<Void> clearAllNotifications(@AuthenticationPrincipal UUID userId) {
    notificationService.clearAllClearable(userId);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Get notification preferences")
  @ApiResponse(responseCode = "200", description = "Notification preferences response.")
  @GetMapping("/preferences")
  public NotificationPreferencesResponse getPreferences(@AuthenticationPrincipal UUID userId) {
    NotificationPreferences preferences = notificationService.getPreferences(userId);
    return NotificationPreferencesResponse.fromDomain(preferences);
  }

  @Operation(summary = "Update notification preferences")
  @ApiResponse(responseCode = "200", description = "Updated notification preferences.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @PutMapping("/preferences")
  public NotificationPreferencesResponse updatePreferences(
      @AuthenticationPrincipal UUID userId,
      @Valid @RequestBody UpdateNotificationPreferencesRequest request) {
    NotificationPreferences updated =
        notificationService.updatePreferences(
            userId,
            request.quietHoursEnabled(),
            request.quietHoursStart(),
            request.quietHoursEnd(),
            request.dueRemindersEnabled(),
            request.overdueRemindersEnabled(),
            request.timeBlockRemindersEnabled(),
            request.focusRemindersEnabled(),
            request.habitRemindersEnabled(),
            request.reviewPromptsEnabled(),
            request.securityNoticesEnabled(),
            request.systemNoticesEnabled(),
            request.inAppChannelEnabled(),
            request.emailChannelEnabled(),
            request.pushChannelEnabled());
    return NotificationPreferencesResponse.fromDomain(updated);
  }

  private static Set<NotificationCategory> parseCategories(
      Set<String> categoriesParam, String categoryParam) {
    Set<NotificationCategory> result = new HashSet<>();
    if (categoriesParam != null) {
      for (String raw : categoriesParam) {
        if (raw == null || raw.isBlank()) {
          continue;
        }
        for (String split : raw.split(",")) {
          NotificationCategory category = NotificationCategory.parse(split);
          if (category != null) {
            result.add(category);
          }
        }
      }
    }
    if (categoryParam != null && !categoryParam.isBlank()) {
      NotificationCategory category = NotificationCategory.parse(categoryParam);
      if (category != null) {
        result.add(category);
      }
    }
    return result;
  }
}

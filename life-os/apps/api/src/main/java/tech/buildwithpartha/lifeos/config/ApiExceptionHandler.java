package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tech.buildwithpartha.lifeos.common.error.ApiProblem;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.CsrfTokenInvalidException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.FocusSessionConflictException;
import tech.buildwithpartha.lifeos.common.error.InvalidCredentialsException;
import tech.buildwithpartha.lifeos.common.error.RateLimitedException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.StandardErrorCodes;
import tech.buildwithpartha.lifeos.common.error.TimeBlockOverlapConflictException;
import tech.buildwithpartha.lifeos.common.error.TokenAlreadyUsedException;
import tech.buildwithpartha.lifeos.common.error.TokenExpiredException;
import tech.buildwithpartha.lifeos.common.error.TokenInvalidException;

/** Maps server failures to safe, versioned Problem Details responses. */
@RestControllerAdvice
public final class ApiExceptionHandler {

  private final ApiProblemFactory problemFactory;

  public ApiExceptionHandler(ApiProblemFactory problemFactory) {
    this.problemFactory = problemFactory;
  }

  @ExceptionHandler(FieldValidationException.class)
  ResponseEntity<ApiProblem> handleFieldValidation(
      FieldValidationException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.BAD_REQUEST,
            exception.code(),
            "Validation failed",
            "One or more fields are invalid.",
            exception.errors()));
  }

  @ExceptionHandler(RateLimitedException.class)
  ResponseEntity<ApiProblem> handleRateLimited(
      RateLimitedException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.TOO_MANY_REQUESTS,
            exception.code(),
            "Too many requests",
            "Try again later."));
  }

  @ExceptionHandler(InvalidCredentialsException.class)
  ResponseEntity<ApiProblem> handleInvalidCredentials(
      InvalidCredentialsException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.UNAUTHORIZED,
            exception.code(),
            "Invalid credentials",
            "Check your email and password and try again."));
  }

  @ExceptionHandler(TokenInvalidException.class)
  ResponseEntity<ApiProblem> handleTokenInvalid(
      TokenInvalidException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.BAD_REQUEST,
            exception.code(),
            "Invalid link",
            "The link is invalid."));
  }

  @ExceptionHandler(TokenExpiredException.class)
  ResponseEntity<ApiProblem> handleTokenExpired(
      TokenExpiredException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.BAD_REQUEST,
            exception.code(),
            "Link expired",
            "The link has expired."));
  }

  @ExceptionHandler(TokenAlreadyUsedException.class)
  ResponseEntity<ApiProblem> handleTokenAlreadyUsed(
      TokenAlreadyUsedException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.CONFLICT,
            exception.code(),
            "Link already used",
            "The link has already been used."));
  }

  @ExceptionHandler(ConcurrencyConflictException.class)
  ResponseEntity<ApiProblem> handleConcurrencyConflict(
      ConcurrencyConflictException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.CONFLICT,
            exception.code(),
            "Conflict",
            "The resource was updated by another request."));
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  ResponseEntity<ApiProblem> handleOptimisticLocking(
      ObjectOptimisticLockingFailureException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.CONFLICT,
            StandardErrorCodes.CONCURRENCY_CONFLICT,
            "Conflict",
            "The resource was updated by another request."));
  }

  @ExceptionHandler(TimeBlockOverlapConflictException.class)
  ResponseEntity<ApiProblem> handleTimeBlockOverlapConflict(
      TimeBlockOverlapConflictException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.CONFLICT,
            exception.code(),
            "Schedule Conflict",
            exception.getMessage()));
  }

  @ExceptionHandler(FocusSessionConflictException.class)
  ResponseEntity<ApiProblem> handleFocusSessionConflict(
      FocusSessionConflictException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.CONFLICT,
            exception.code(),
            "Focus Session conflict",
            "Refresh the active Focus Session and try again."));
  }

  @ExceptionHandler(CsrfTokenInvalidException.class)
  ResponseEntity<ApiProblem> handleCsrfTokenInvalid(
      CsrfTokenInvalidException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.FORBIDDEN,
            exception.code(),
            "CSRF token invalid",
            "Refresh and try again."));
  }

  @ExceptionHandler(CodedException.class)
  ResponseEntity<ApiProblem> handleCoded(CodedException exception, HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.BAD_REQUEST,
            exception.code(),
            "Request rejected",
            "The request could not be completed."));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiProblem> handleValidation(
      MethodArgumentNotValidException exception, HttpServletRequest request) {
    List<FieldProblem> errors =
        exception.getBindingResult().getFieldErrors().stream()
            .map(
                error ->
                    new FieldProblem(
                        error.getField(), error.getCode() == null ? "INVALID" : error.getCode()))
            .distinct()
            .sorted(Comparator.comparing(FieldProblem::field).thenComparing(FieldProblem::code))
            .toList();

    return response(
        problemFactory.create(
            request,
            HttpStatus.BAD_REQUEST,
            StandardErrorCodes.VALIDATION_FAILED,
            "Validation failed",
            "One or more fields are invalid.",
            errors));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<ApiProblem> handleUnreadable(HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.BAD_REQUEST,
            StandardErrorCodes.INVALID_REQUEST,
            "Invalid request",
            "The request body could not be read."));
  }

  @ExceptionHandler({NoResourceFoundException.class, ResourceNotFoundException.class})
  ResponseEntity<ApiProblem> handleNotFound(HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.NOT_FOUND,
            StandardErrorCodes.RESOURCE_NOT_FOUND,
            "Resource not found",
            "The requested resource does not exist."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiProblem> handleUnexpected(HttpServletRequest request) {
    return response(
        problemFactory.create(
            request,
            HttpStatus.INTERNAL_SERVER_ERROR,
            StandardErrorCodes.INTERNAL_ERROR,
            "Internal server error",
            "The request could not be completed."));
  }

  private static ResponseEntity<ApiProblem> response(ApiProblem problem) {
    return ResponseEntity.status(problem.status())
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem);
  }
}

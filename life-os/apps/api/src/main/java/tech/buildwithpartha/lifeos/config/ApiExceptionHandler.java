package tech.buildwithpartha.lifeos.config;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tech.buildwithpartha.lifeos.common.error.ApiProblem;
import tech.buildwithpartha.lifeos.common.error.CodedException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.StandardErrorCodes;

/** Maps server failures to safe, versioned Problem Details responses. */
@RestControllerAdvice
public final class ApiExceptionHandler {

  private final ApiProblemFactory problemFactory;

  public ApiExceptionHandler(ApiProblemFactory problemFactory) {
    this.problemFactory = problemFactory;
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

  @ExceptionHandler(NoResourceFoundException.class)
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

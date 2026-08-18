package tech.buildwithpartha.lifeos.common.error;

import java.util.List;

/**
 * A request failure with safe field-level detail, for validation that cannot be expressed as a Bean
 * Validation annotation (for example a policy check against a live port, such as {@code
 * auth.application.PasswordService.validate}).
 *
 * <p>Always carries {@link StandardErrorCodes#VALIDATION_FAILED} so a caller sees one stable code
 * for both this and the {@code MethodArgumentNotValidException} path {@code ApiExceptionHandler}
 * already handles; {@link #errors()} is the safe, code-only field detail (never a rejected value).
 */
public final class FieldValidationException extends CodedException {

  private final List<FieldProblem> errors;

  public FieldValidationException(String message, List<FieldProblem> errors) {
    super(StandardErrorCodes.VALIDATION_FAILED, message);
    this.errors = List.copyOf(errors);
  }

  public List<FieldProblem> errors() {
    return errors;
  }
}

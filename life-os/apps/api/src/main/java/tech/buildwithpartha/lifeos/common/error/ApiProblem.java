package tech.buildwithpartha.lifeos.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Objects;

/** Versioned RFC Problem Details response with stable LifeOS extensions. */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiProblem(
    String type,
    String title,
    int status,
    String detail,
    String instance,
    String code,
    String correlationId,
    List<FieldProblem> errors) {

  public ApiProblem {
    Objects.requireNonNull(type, "type must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(detail, "detail must not be null");
    Objects.requireNonNull(instance, "instance must not be null");
    Objects.requireNonNull(code, "code must not be null");
    Objects.requireNonNull(correlationId, "correlationId must not be null");
    errors = List.copyOf(Objects.requireNonNull(errors, "errors must not be null"));
  }
}
